import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Login for system administrators (authenticate against
 * healthcare_platform_systemadmins and manage JWT session)
 *
 * Authenticates a system administrator using provided credentials (local
 * password or federated SSO), verifies active/system-admin status, and issues
 * JWT tokens for API access. On successful authentication, rotates/creates a
 * new session, writes audit and session logs, and never exposes sensitive
 * hashes or disabled user records. On failure (invalid credentials or inactive
 * user), logs a security incident and does not issue tokens.
 *
 * Only enabled for active, non-deleted system administrators.
 *
 * @param props Request body containing IHealthcarePlatformSystemAdmin.ILogin
 *   (email, provider, provider_key, password?)
 * @returns IHealthcarePlatformSystemAdmin.IAuthorized object with admin profile
 *   and session tokens
 * @throws {Error} When credentials are invalid or user is deleted/inactive
 */
export async function postauthSystemAdminLogin(props: {
  body: IHealthcarePlatformSystemAdmin.ILogin;
}): Promise<IHealthcarePlatformSystemAdmin.IAuthorized> {
  const { email, provider, provider_key, password } = props.body;
  const now = toISOStringSafe(new Date());
  // 1. Find user_auth record for active (not soft-deleted) admin
  const userAuth =
    await MyGlobal.prisma.healthcare_platform_user_authentications.findFirst({
      where: {
        provider,
        provider_key,
        user_type: "systemadmin",
        deleted_at: null,
      },
    });

  // Security log if userAuth not found
  if (!userAuth) {
    await MyGlobal.prisma.healthcare_platform_security_incidents.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        opened_by_user_id: undefined,
        organization_id: "system",
        incident_type: "FAILED_LOGIN",
        summary: `Failed login: invalid credentials for provider=${provider}`,
        details: JSON.stringify({ email, provider, provider_key }),
        status: "OPEN",
        severity: "MEDIUM",
        opened_at: now,
        updated_at: now,
      },
    });
    throw new Error("Invalid credentials");
  }

  // 2. Find active (not deleted) system admin user
  const systemAdmin =
    await MyGlobal.prisma.healthcare_platform_systemadmins.findFirst({
      where: {
        id: userAuth.user_id,
        deleted_at: null,
      },
    });

  if (!systemAdmin) {
    await MyGlobal.prisma.healthcare_platform_security_incidents.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        opened_by_user_id: userAuth.user_id,
        organization_id: "system",
        incident_type: "FAILED_LOGIN",
        summary: `Failed login: deleted or inactive admin id=${userAuth.user_id}`,
        details: JSON.stringify({ email }),
        status: "OPEN",
        severity: "MEDIUM",
        opened_at: now,
        updated_at: now,
      },
    });
    throw new Error("Account is not active");
  }

  // 3. Provider == local: must check password
  if (provider === "local") {
    if (!userAuth.password_hash || !password) {
      await MyGlobal.prisma.healthcare_platform_security_incidents.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          opened_by_user_id: userAuth.user_id,
          organization_id: "system",
          incident_type: "FAILED_LOGIN",
          summary: `Failed login: missing or blank password for local login`,
          details: JSON.stringify({ email }),
          status: "OPEN",
          severity: "MEDIUM",
          opened_at: now,
          updated_at: now,
        },
      });
      throw new Error("Invalid credentials");
    }
    const verified = await MyGlobal.password.verify(
      password,
      userAuth.password_hash,
    );
    if (!verified) {
      await MyGlobal.prisma.healthcare_platform_security_incidents.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          opened_by_user_id: userAuth.user_id,
          organization_id: "system",
          incident_type: "FAILED_LOGIN",
          summary: `Failed login: bad password for admin id=${userAuth.user_id}`,
          details: JSON.stringify({ email }),
          status: "OPEN",
          severity: "MEDIUM",
          opened_at: now,
          updated_at: now,
        },
      });
      throw new Error("Invalid credentials");
    }
  }

  // 4. Generate tokens
  const sessionId = v4();
  const sessionToken = v4();
  const refreshToken = v4();
  // Access/refresh expiries
  const accessExpires = toISOStringSafe(new Date(Date.now() + 1000 * 60 * 60)); // 1h
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
  ); // 7d

  // JWT payload
  const payload = {
    id: systemAdmin.id,
    type: "systemAdmin",
  };
  const accessJWT = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshJWT = jwt.sign(
    { ...payload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // 5. Create session record (token=access, refresh_token=refresh)
  await MyGlobal.prisma.healthcare_platform_auth_sessions.create({
    data: {
      id: sessionId,
      user_id: systemAdmin.id,
      user_type: "systemadmin",
      session_token: accessJWT,
      refresh_token: refreshJWT,
      issued_at: now,
      expires_at: accessExpires,
      revoked_at: null,
      user_agent: undefined,
      ip_address: undefined,
    },
  });

  // 6. Write audit log
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: systemAdmin.id,
      organization_id: undefined,
      action_type: "LOGIN",
      event_context: JSON.stringify({ provider, provider_key }),
      ip_address: undefined,
      related_entity_type: "systemAdmin",
      related_entity_id: systemAdmin.id,
      created_at: now,
    },
  });

  // 7. Update last_authenticated_at
  await MyGlobal.prisma.healthcare_platform_user_authentications.update({
    where: { id: userAuth.id },
    data: {
      last_authenticated_at: now,
      updated_at: now,
    },
  });

  // 8. Build DTO
  return {
    id: systemAdmin.id,
    email: systemAdmin.email,
    full_name: systemAdmin.full_name,
    phone: systemAdmin.phone === undefined ? undefined : systemAdmin.phone,
    created_at: toISOStringSafe(systemAdmin.created_at),
    updated_at: toISOStringSafe(systemAdmin.updated_at),
    deleted_at: systemAdmin.deleted_at
      ? toISOStringSafe(systemAdmin.deleted_at)
      : undefined,
    token: {
      access: accessJWT,
      refresh: refreshJWT,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
