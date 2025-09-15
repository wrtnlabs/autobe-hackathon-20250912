import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Authenticate organization administrator and issue access/refresh JWT tokens.
 *
 * This endpoint validates an organization admin's credentials using either
 * password or federated login. It ensures the user's account is active, checks
 * authentication method, creates a session record, and returns both access and
 * refresh tokens with session metadata per security requirements.
 *
 * @param props - Request object containing login information for organization
 *   admin
 * @param props.body - Organization admin login credentials ({ email, password?,
 *   provider?, provider_key? })
 * @returns Authorized session information and JWT/refresh tokens ({ id, email,
 *   full_name, phone?, created_at, updated_at, deleted_at?, token })
 * @throws {Error} If credentials are invalid or the admin account is not
 *   found/active.
 */
export async function postauthOrganizationAdminLogin(props: {
  body: IHealthcarePlatformOrganizationAdmin.ILogin;
}): Promise<IHealthcarePlatformOrganizationAdmin.IAuthorized> {
  const { email, password, provider, provider_key } = props.body;

  // 1. Find admin user by email (active only)
  const admin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: {
        email,
        deleted_at: null,
      },
    });
  if (!admin) throw new Error("Invalid credentials");

  // 2. Retrieve authentication row
  let auth;
  if (password && typeof password === "string") {
    // Local (password) login
    auth =
      await MyGlobal.prisma.healthcare_platform_user_authentications.findFirst({
        where: {
          user_id: admin.id,
          user_type: "organizationadmin",
          provider: "local",
          deleted_at: null,
        },
      });
    if (!auth || !auth.password_hash) throw new Error("Invalid credentials");
    const valid = await MyGlobal.password.verify(password, auth.password_hash);
    if (!valid) throw new Error("Invalid credentials");
  } else if (provider && provider_key) {
    // Federated login (SSO)
    auth =
      await MyGlobal.prisma.healthcare_platform_user_authentications.findFirst({
        where: {
          user_id: admin.id,
          user_type: "organizationadmin",
          provider,
          provider_key,
          deleted_at: null,
        },
      });
    if (!auth) throw new Error("Invalid credentials");
  } else {
    throw new Error("Invalid login method");
  }

  // 3. Prepare session tokens and times
  const now = toISOStringSafe(new Date());
  // Access: 1 hour, refresh: 7 days
  const accessTokenExpire = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshTokenExpire = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session_token = v4();
  const refresh_token = v4();

  // 4. Record new session
  await MyGlobal.prisma.healthcare_platform_auth_sessions.create({
    data: {
      id: v4(),
      user_id: admin.id,
      user_type: "organizationadmin",
      session_token,
      refresh_token,
      issued_at: now,
      expires_at: accessTokenExpire,
      revoked_at: null,
      user_agent: undefined,
      ip_address: undefined,
    },
  });

  // 5. Issue JWT tokens (access, refresh)
  const access = jwt.sign(
    { id: admin.id, type: "organizationadmin" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    { id: admin.id, type: "organizationadmin", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // 6. Return DTO per IHealthcarePlatformOrganizationAdmin.IAuthorized (never use Date or as)
  return {
    id: admin.id,
    email: admin.email,
    full_name: admin.full_name,
    phone: admin.phone ?? undefined,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at
      ? toISOStringSafe(admin.deleted_at)
      : undefined,
    token: {
      access,
      refresh,
      expired_at: accessTokenExpire,
      refreshable_until: refreshTokenExpire,
    },
  };
}
