import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";

/**
 * Authenticate nurse user and issue tokens using nurse schema and
 * authentication record (healthcare_platform_nurses).
 *
 * Enables nurse users (clinical staff) to log in securely and obtain session
 * tokens for accessing the healthcare platform. Validates the nurse's
 * credentials via the associated authentication record and returns a JWT
 * access/refresh token pair along with nurse profile fields. Only active (not
 * soft-deleted) nurse accounts are eligible. No sensitive fields are exposed
 * nor authentication state leaks; all errors use unified messaging.
 * Auditing/session logs are handled by separate endpoints/tables per compliance
 * policy.
 *
 * @param props - Login props containing nurse credentials.
 * @param props.body - The login body with email and password fields.
 * @returns Authenticated nurse session/profile and JWT tokens.
 * @throws {Error} If credentials are invalid, nurse is deleted, authentication
 *   record does not exist, or password is invalid.
 */
export async function postauthNurseLogin(props: {
  body: IHealthcarePlatformNurse.ILogin;
}): Promise<IHealthcarePlatformNurse.IAuthorized> {
  const { email, password } = props.body;

  // 1. Find nurse by email, must be active (not soft-deleted)
  const nurse = await MyGlobal.prisma.healthcare_platform_nurses.findFirst({
    where: {
      email,
      deleted_at: null,
    },
  });
  if (!nurse) throw new Error("Invalid login credentials");

  // 2. Find corresponding user authentication record for nurse
  const userAuth =
    await MyGlobal.prisma.healthcare_platform_user_authentications.findFirst({
      where: {
        user_id: nurse.id,
        user_type: "nurse",
        provider: "local",
        provider_key: email,
        deleted_at: null,
      },
    });
  if (!userAuth || !userAuth.password_hash)
    throw new Error("Invalid login credentials");

  // 3. Password check
  const passwordValid = await MyGlobal.password.verify(
    password,
    userAuth.password_hash,
  );
  if (!passwordValid) throw new Error("Invalid login credentials");

  // 4. Prepare JWT payload
  const payload = {
    id: nurse.id,
    type: "nurse",
  };

  // 5. Generate JWT access and refresh tokens
  const access = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(
    { ...payload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // 6. Decode expiry as UNIX seconds, convert to ISO8601 string
  const accessDecoded = jwt.decode(access) as { exp: number };
  const refreshDecoded = jwt.decode(refresh) as { exp: number };
  const expired_at = toISOStringSafe(new Date(accessDecoded.exp * 1000));
  const refreshable_until = toISOStringSafe(
    new Date(refreshDecoded.exp * 1000),
  );

  // 7. Compose authorized return value - all branding enforced by structure
  return {
    id: nurse.id,
    email: nurse.email,
    full_name: nurse.full_name,
    license_number: nurse.license_number,
    specialty: nurse.specialty ?? null,
    phone: nurse.phone ?? null,
    created_at: toISOStringSafe(nurse.created_at),
    updated_at: toISOStringSafe(nurse.updated_at),
    deleted_at: nurse.deleted_at
      ? toISOStringSafe(nurse.deleted_at)
      : undefined,
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
  };
}
