import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";

/**
 * Authenticate a receptionist and issue JWT tokens
 * (healthcare_platform_receptionists)
 *
 * This endpoint authenticates a receptionist by verifying provided credentials
 * (email/password) against stored password_hash in
 * healthcare_platform_user_authentications. On success, issues JWT
 * access/refresh tokens and inserts an auth session for compliance. Returns
 * receptionist profile + JWT tokens with audit fields.
 *
 * @param props - Request containing receptionist login credentials
 * @returns Authorized receptionist session info with JWT tokens
 * @throws {Error} When authentication fails or account is deleted/inactive/does
 *   not exist
 */
export async function postauthReceptionistLogin(props: {
  body: IHealthcarePlatformReceptionist.ILogin;
}): Promise<IHealthcarePlatformReceptionist.IAuthorized> {
  const { email, password } = props.body;
  // Find active receptionist by email
  const receptionist =
    await MyGlobal.prisma.healthcare_platform_receptionists.findUnique({
      where: { email },
    });
  // Validate existence and not deleted
  if (
    !receptionist ||
    (receptionist.deleted_at !== null && receptionist.deleted_at !== undefined)
  ) {
    throw new Error("Invalid credentials");
  }
  // Find authentication record for receptionist (local provider)
  const userAuth =
    await MyGlobal.prisma.healthcare_platform_user_authentications.findFirst({
      where: {
        user_id: receptionist.id,
        user_type: "receptionist",
        provider: "local",
        provider_key: email,
        deleted_at: null,
      },
    });
  // Ensure authentication record and password_hash
  if (!userAuth || !userAuth.password_hash) {
    throw new Error("Invalid credentials");
  }
  // Validate password
  const valid = await MyGlobal.password.verify(
    password,
    userAuth.password_hash,
  );
  if (!valid) {
    throw new Error("Invalid credentials");
  }
  // Timestamps for tokens and session
  const issuedAt = toISOStringSafe(new Date());
  // Calculate access token expiry (1 hour from now)
  const expiredAtMillis = Date.now() + 60 * 60 * 1000;
  const expired_at = toISOStringSafe(new Date(expiredAtMillis));
  // Calculate refreshable_until (7 days from now)
  const refreshableMillis = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const refreshable_until = toISOStringSafe(new Date(refreshableMillis));
  // JWT payload for access/refresh tokens
  const payload = { id: receptionist.id, type: "receptionist" };
  // Access token
  const access = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  // Refresh token
  const refresh = jwt.sign(
    { ...payload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Create session record
  await MyGlobal.prisma.healthcare_platform_auth_sessions.create({
    data: {
      id: v4(),
      user_id: receptionist.id,
      user_type: "receptionist",
      session_token: access,
      refresh_token: refresh,
      issued_at: issuedAt,
      expires_at: expired_at,
      revoked_at: null,
      user_agent: undefined,
      ip_address: undefined,
    },
  });
  // Update last_authenticated_at and updated_at for user_auth
  await MyGlobal.prisma.healthcare_platform_user_authentications.update({
    where: { id: userAuth.id },
    data: {
      last_authenticated_at: issuedAt,
      updated_at: issuedAt,
    },
  });
  // Return authorized receptionist profile and tokens
  return {
    id: receptionist.id,
    email: receptionist.email,
    full_name: receptionist.full_name,
    phone:
      receptionist.phone === null ? null : (receptionist.phone ?? undefined),
    created_at: toISOStringSafe(receptionist.created_at),
    updated_at: toISOStringSafe(receptionist.updated_at),
    deleted_at: receptionist.deleted_at
      ? toISOStringSafe(receptionist.deleted_at)
      : undefined,
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
  };
}
