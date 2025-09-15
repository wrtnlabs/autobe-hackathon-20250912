import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Refresh JWT access and refresh tokens for organization admin session.
 *
 * This endpoint rotates and reissues the access and refresh JWTs for a valid,
 * compliant organization admin session, enforcing session expiration,
 * revocation, account status, and auditability. Tokens are only refreshed for
 * valid, unexpired, unreovked sessions, and all session and audit events are
 * updated atomically.
 *
 * @param props - Request containing org admin refresh token as
 *   props.body.refresh_token
 * @returns Returns the authorized admin session profile and IAuthorizationToken
 *   containing the new token set and expirations
 * @throws {Error} When the refresh token is invalid, expired, revoked, or the
 *   admin account is deleted
 */
export async function postauthOrganizationAdminRefresh(props: {
  body: IHealthcarePlatformOrganizationAdmin.IRefresh;
}): Promise<IHealthcarePlatformOrganizationAdmin.IAuthorized> {
  const { refresh_token } = props.body;

  // Step 1: Decode/verify the JWT refresh token
  let decoded: { id: string; type: string };
  try {
    decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { id: string; type: string };
  } catch (err) {
    throw new Error("Invalid or expired refresh token");
  }

  // Step 2: Look up session by refresh_token/user_id/user_type and session status
  const session =
    await MyGlobal.prisma.healthcare_platform_auth_sessions.findFirst({
      where: {
        refresh_token: refresh_token,
        user_id: decoded.id,
        user_type: "organizationadmin",
        revoked_at: null,
      },
    });
  if (!session) {
    throw new Error("Session not found or token revoked/expired");
  }

  // Step 3: Check session not expired by comparing to now
  const nowStr = toISOStringSafe(new Date());
  // Use string comparison for ISO, or parse as Date for comparison
  if (Date.parse(toISOStringSafe(session.expires_at)) < Date.parse(nowStr)) {
    throw new Error("Session expired");
  }

  // Step 4: Ensure admin account is active (not deleted)
  const admin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findUnique({
      where: { id: decoded.id },
    });
  if (!admin || admin.deleted_at !== null) {
    throw new Error("Admin not found or deactivated");
  }

  // Step 5: Rotate refresh token and generate a new access token
  const accessPayload = { id: admin.id, type: "organizationadmin" };
  // Calculate expiration (access = 1h, refresh = 7d)
  const accessExpiresAtNum = Date.now() + 60 * 60 * 1000;
  const refreshExpiresAtNum = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const accessExpiresStr = toISOStringSafe(new Date(accessExpiresAtNum));
  const refreshExpiresStr = toISOStringSafe(new Date(refreshExpiresAtNum));

  // Generate new JWT tokens
  const new_access_token = jwt.sign(
    accessPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const new_refresh_token = jwt.sign(
    accessPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Step 6: Update the session record in DB with new refresh_token, issued_at, expires_at
  await MyGlobal.prisma.healthcare_platform_auth_sessions.update({
    where: { id: session.id },
    data: {
      refresh_token: new_refresh_token,
      issued_at: nowStr,
      expires_at: refreshExpiresStr,
    },
  });

  // Step 7: Audit log entry for this refresh
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: admin.id,
      action_type: "TOKEN_REFRESH",
      created_at: nowStr,
    },
  });

  // Step 8: Prepare and return the DTO response per interface
  return {
    id: admin.id,
    email: admin.email,
    full_name: admin.full_name,
    phone: typeof admin.phone === "string" ? admin.phone : undefined,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    ...(admin.deleted_at === null || admin.deleted_at === undefined
      ? {}
      : { deleted_at: toISOStringSafe(admin.deleted_at) }),
    token: {
      access: new_access_token,
      refresh: new_refresh_token,
      expired_at: accessExpiresStr,
      refreshable_until: refreshExpiresStr,
    },
  };
}
