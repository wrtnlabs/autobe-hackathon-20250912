import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";

/**
 * Register new department head (healthcare_platform_departmentheads) and issue
 * JWT tokens.
 *
 * This operation creates a new department head in the healthcarePlatform system
 * (department-level admin user). It requires a unique email, full legal name,
 * and authenticates via either password (stored as hash) or SSO provider/key.
 * Upon successful registration, JWT access and refresh tokens are issued per
 * platform policy. All date fields are provided as ISO8601 formatted strings
 * with proper branding.
 *
 * Business rules:
 *
 * - Email must be unique (per department heads table).
 * - Full_name is required.
 * - Either password or SSO provider + key must be provided (not both
 *   null/undefined).
 * - Password is hashed before storing; plain is never persisted.
 * - Auditing and compliance logging are handled outside this scope.
 *
 * @param props.body - Department head registration fields (see IJoinRequest for
 *   structure).
 * @returns Complete authorized user profile with issued authorization tokens
 *   according to IAuthorized DTO.
 * @throws {Error} If email is duplicate, required field is missing, or
 *   authentication method is invalid.
 */
export async function postauthDepartmentHeadJoin(props: {
  body: IHealthcarePlatformDepartmentHead.IJoinRequest;
}): Promise<IHealthcarePlatformDepartmentHead.IAuthorized> {
  const { body } = props;

  // Enforce required fields
  if (typeof body.email !== "string" || body.email.length === 0) {
    throw new Error("Email is required and must be valid");
  }
  if (typeof body.full_name !== "string" || body.full_name.length === 0) {
    throw new Error("full_name is required");
  }

  // Credential method validation
  const usesPassword = body.password != null && body.password.length > 0;
  const usesSSO =
    body.sso_provider != null &&
    body.sso_provider.length > 0 &&
    body.sso_provider_key != null &&
    body.sso_provider_key.length > 0;
  if (!(usesPassword || usesSSO)) {
    throw new Error(
      "Either password or (sso_provider and sso_provider_key) must be provided",
    );
  }

  // Check for duplicate department head email (including soft deleted)
  const existing =
    await MyGlobal.prisma.healthcare_platform_departmentheads.findFirst({
      where: { email: body.email },
    });
  if (existing) {
    throw new Error("A department head with this email already exists");
  }

  // Timestamps without Date type, for consistent branding
  const now = toISOStringSafe(new Date());
  // Construct UUID without 'as' (TypeScript will infer correctly from v4 usage)
  const departmentHeadId = v4();
  const authId = v4();

  // Create department head account
  const departmentHead =
    await MyGlobal.prisma.healthcare_platform_departmentheads.create({
      data: {
        id: departmentHeadId,
        email: body.email,
        full_name: body.full_name,
        phone: body.phone != null ? body.phone : null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Set up authentication provider details
  let provider: string;
  let provider_key: string;
  let password_hash: string | null = null;
  if (usesPassword) {
    provider = "local";
    provider_key = body.email;
    password_hash = await MyGlobal.password.hash(body.password!);
  } else if (usesSSO) {
    provider = body.sso_provider!;
    provider_key = body.sso_provider_key!;
    password_hash = null;
  } else {
    throw new Error("Invalid authentication method");
  }

  await MyGlobal.prisma.healthcare_platform_user_authentications.create({
    data: {
      id: authId,
      user_id: departmentHeadId,
      user_type: "departmentHead",
      provider,
      provider_key,
      password_hash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // JWT token payload (do not annotate or cast types)
  const accessExpiresMs = 60 * 60 * 1000; // 1 hour
  const refreshExpiresMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + accessExpiresMs),
  );
  const refreshExpiredAt = toISOStringSafe(
    new Date(Date.now() + refreshExpiresMs),
  );

  const jwtPayload = { id: departmentHeadId, type: "departmentHead" };
  const access = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(
    { ...jwtPayload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Build output with strict handling of all optional/nullable
  const result: IHealthcarePlatformDepartmentHead.IAuthorized = {
    id: departmentHead.id,
    email: departmentHead.email,
    full_name: departmentHead.full_name,
    phone: departmentHead.phone != null ? departmentHead.phone : undefined,
    created_at: toISOStringSafe(departmentHead.created_at),
    updated_at: toISOStringSafe(departmentHead.updated_at),
    deleted_at:
      departmentHead.deleted_at != null
        ? toISOStringSafe(departmentHead.deleted_at)
        : undefined,
    token: {
      access,
      refresh,
      expired_at: accessExpiredAt,
      refreshable_until: refreshExpiredAt,
    },
    role: "departmentHead",
  };
  return result;
}
