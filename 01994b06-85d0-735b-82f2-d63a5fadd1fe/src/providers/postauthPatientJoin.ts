import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";

/**
 * Register a new patient in healthcare_platform_patients and authorize via
 * join.
 *
 * This operation creates a new patient record and credentials (with hashed
 * password or federated provider key) under regulatory and privacy controls,
 * then issues an initial authentication token set for secure platform access.
 * Handles duplicate email/all identity checks, credential hashing, and patient
 * onboarding audit. All returned date values are strictly string &
 * tags.Format<'date-time'>.
 *
 * @param props - Registration properties
 * @param props.body - The IHealthcarePlatformPatient.IJoin registration payload
 * @returns IHealthcarePlatformPatient.IAuthorized - Identity and authorization
 *   structure including profile and tokens
 * @throws {Error} When email already exists, required fields are missing,
 *   credential bootstrapping fails, or token could not be issued.
 */
export async function postauthPatientJoin(props: {
  body: IHealthcarePlatformPatient.IJoin;
}): Promise<IHealthcarePlatformPatient.IAuthorized> {
  const { body } = props;
  // Validate required fields
  if (!body.email || !body.full_name || !body.date_of_birth) {
    throw new Error(
      "Missing required registration fields (email, full_name, date_of_birth)",
    );
  }
  // Must use either password OR SSO provider pattern
  const usePassword =
    !!body.password && (body.provider === undefined || body.provider === null);
  const useSSO = !!body.provider && !!body.provider_key && !body.password;
  if (!usePassword && !useSSO) {
    throw new Error(
      "Registration requires either a password or federated provider + key (not both)",
    );
  }
  // Enforce unique email
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_patients.findFirst({
      where: { email: body.email },
      select: { id: true },
    });
  if (duplicate) {
    throw new Error("Email already registered");
  }
  // Prepare all fields for creation
  const patient_id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());
  // Create patient record
  const patient = await MyGlobal.prisma.healthcare_platform_patients.create({
    data: {
      id: patient_id,
      email: body.email,
      full_name: body.full_name,
      date_of_birth: body.date_of_birth,
      phone: body.phone ?? undefined,
      created_at: now,
      updated_at: now,
    },
  });
  // Credential record preparation
  let password_hash: string | undefined = undefined;
  if (usePassword) {
    password_hash = await MyGlobal.password.hash(body.password!);
  }
  await MyGlobal.prisma.healthcare_platform_user_authentications.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: patient_id,
      user_type: "patient",
      provider: usePassword ? "local" : body.provider!,
      provider_key: usePassword ? body.email : body.provider_key!,
      password_hash: password_hash ?? undefined,
      created_at: now,
      updated_at: now,
    },
  });
  // JWT and refresh token calculation
  const accessPayload = { id: patient_id, type: "patient" };
  const jwtSecret = MyGlobal.env.JWT_SECRET_KEY;
  const accessExpiresIn = 60 * 60; // 1 hour (seconds)
  const refreshExpiresIn = 60 * 60 * 24 * 7; // 7 days (seconds)

  const accessToken = jwt.sign(accessPayload, jwtSecret, {
    expiresIn: accessExpiresIn,
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(
    { id: patient_id, type: "patient", tokenType: "refresh" },
    jwtSecret,
    { expiresIn: refreshExpiresIn, issuer: "autobe" },
  );

  const expired_at = toISOStringSafe(
    new Date(Date.now() + accessExpiresIn * 1000),
  );
  const refreshable_until = toISOStringSafe(
    new Date(Date.now() + refreshExpiresIn * 1000),
  );

  return {
    id: patient.id,
    email: patient.email,
    full_name: patient.full_name,
    date_of_birth: patient.date_of_birth,
    phone: patient.phone ?? undefined,
    created_at: patient.created_at,
    updated_at: patient.updated_at,
    deleted_at: patient.deleted_at ? patient.deleted_at : undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expired_at,
      refreshable_until: refreshable_until,
    },
    refresh_token: refreshToken,
  };
}
