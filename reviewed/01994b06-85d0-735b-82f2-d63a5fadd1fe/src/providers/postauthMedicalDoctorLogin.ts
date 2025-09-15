import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Authenticate and issue tokens for a medical doctor
 * (healthcare_platform_medicaldoctors).
 *
 * Authenticates a registered medical doctor by verifying email/password
 * credentials against the user authentication table (must be active, not soft
 * deleted). Returns doctor info and JWT tokens with strict business logic.
 * Ensures never returns sensitive credential data. Throws on invalid
 * credentials, wrong account, or inactive/suspended doctor.
 *
 * @param props - Object with authentication prop (medicalDoctor:
 *   MedicaldoctorPayload) and login credentials in body
 * @param props.medicalDoctor - JWT-provided payload for login context (not
 *   required for login logic)
 * @param props.body - Email and password credentials for login
 * @returns Authenticated doctor profile info with issued JWT tokens
 * @throws {Error} If credentials invalid, profile is deleted/archived, or
 *   password mismatch
 */
export async function postauthMedicalDoctorLogin(props: {
  medicalDoctor: MedicaldoctorPayload;
  body: IHealthcarePlatformMedicalDoctor.ILogin;
}): Promise<IHealthcarePlatformMedicalDoctor.IAuthorized> {
  const { email, password } = props.body;
  // Lookup authentication record: must be local provider, user_type medicaldoctor, provider_key=email, deleted_at=null
  const auth =
    await MyGlobal.prisma.healthcare_platform_user_authentications.findFirst({
      where: {
        provider: "local",
        provider_key: email,
        user_type: "medicaldoctor",
        deleted_at: null,
      },
    });
  if (!auth || !auth.password_hash) {
    throw new Error("Invalid credentials");
  }
  // Lookup doctor profile by user_id. Must be active (deleted_at: null) and email must match.
  const doctor =
    await MyGlobal.prisma.healthcare_platform_medicaldoctors.findFirst({
      where: {
        id: auth.user_id,
        email: email,
        deleted_at: null,
      },
    });
  if (!doctor) {
    throw new Error("Invalid credentials");
  }
  // Verify password using MyGlobal.password.verify
  const verified = await MyGlobal.password.verify(password, auth.password_hash);
  if (!verified) {
    throw new Error("Invalid credentials");
  }
  // Issue JWT tokens with payload (doctor id/type)
  const payload = { id: doctor.id, type: "medicalDoctor" };
  // Access token (1h)
  const access = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  // Refresh token (7d)
  const refresh = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });
  // To get expiration, decode token without verifying signature (JWT spec: payload.exp = unix timestamp)
  // JWT payload epoch "exp" seconds
  const decodeAccess: { exp: number } = jwt.decode(access) as { exp: number };
  const decodeRefresh: { exp: number } = jwt.decode(refresh) as { exp: number };
  // Convert unix seconds to ISO string (UTC, Z)
  const expired_at = toISOStringSafe(new Date(decodeAccess.exp * 1000));
  const refreshable_until = toISOStringSafe(new Date(decodeRefresh.exp * 1000));
  // Compose doctor profile and tokens; convert all dates strictly
  return {
    id: doctor.id,
    email: doctor.email,
    full_name: doctor.full_name,
    npi_number: doctor.npi_number,
    specialty: doctor.specialty === undefined ? undefined : doctor.specialty,
    phone: doctor.phone === undefined ? undefined : doctor.phone,
    created_at: toISOStringSafe(doctor.created_at),
    updated_at: toISOStringSafe(doctor.updated_at),
    deleted_at: doctor.deleted_at
      ? toISOStringSafe(doctor.deleted_at)
      : undefined,
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
  };
}
