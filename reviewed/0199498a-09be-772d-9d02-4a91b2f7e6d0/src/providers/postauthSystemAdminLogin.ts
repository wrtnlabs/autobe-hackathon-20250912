import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Authenticate systemAdmin using external_admin_id and issue JWT access token
 * if active (storyfield_ai_systemadmins).
 *
 * This function implements admin login using external SSO/JWT-mapped identity,
 * verifying existence and non-deactivated status. It issues new access/refresh
 * tokens, records a session in 'storyfield_ai_token_sessions', updates
 * last_login_at on the admin, and logs to 'storyfield_ai_auth_audit_logs'.
 *
 * @param props - Object containing system admin login info
 * @param props.body - The login data: external_admin_id and email (SSO mapped)
 * @returns Authorized system admin session details, JWT tokens, and admin
 *   identity fields
 * @throws {Error} If login credentials are invalid or admin is soft-deleted
 */
export async function postauthSystemAdminLogin(props: {
  body: IStoryfieldAiSystemAdmin.ILogin;
}): Promise<IStoryfieldAiSystemAdmin.IAuthorized> {
  const { external_admin_id, email } = props.body;

  // 1. Find the admin by credentials, enforcing active status only
  const admin = await MyGlobal.prisma.storyfield_ai_systemadmins.findFirst({
    where: {
      external_admin_id,
      email,
      deleted_at: null,
    },
  });
  if (!admin) {
    throw new Error("Invalid credentials or administrator deactivated.");
  }

  // 2. Set last_login_at to now (ISO string)
  const nowDate = toISOStringSafe(new Date());
  await MyGlobal.prisma.storyfield_ai_systemadmins.update({
    where: { id: admin.id },
    data: { last_login_at: nowDate },
  });

  // 3. Generate JWT tokens
  const accessTTL = 60 * 60; // 1 hour (in seconds)
  const refreshTTL = 60 * 60 * 24 * 7; // 7 days (in seconds)
  const nowEpochSec = Math.floor(Date.now() / 1000);
  const accessExpSec = nowEpochSec + accessTTL;
  const refreshExpSec = nowEpochSec + refreshTTL;

  // Compose payload
  const payload = { id: admin.id, type: "systemAdmin" };
  const accessToken = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: accessTTL,
    issuer: "autobe",
  });
  const refreshPayload = {
    id: admin.id,
    type: "systemAdmin",
    tokenType: "refresh",
  };
  const refreshToken = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: refreshTTL,
    issuer: "autobe",
  });

  // Calculate expiry strings
  const accessExpiresAt = toISOStringSafe(new Date(accessExpSec * 1000));
  const refreshExpiresAt = toISOStringSafe(new Date(refreshExpSec * 1000));

  // 4. Register session in token_sessions
  const sessionId = v4();
  const sessionFingerprint = v4();
  const tokenHash = await MyGlobal.password.hash(accessToken);

  await MyGlobal.prisma.storyfield_ai_token_sessions.create({
    data: {
      id: sessionId,
      system_admin_id: admin.id,
      token_hash: tokenHash,
      fingerprint: sessionFingerprint,
      issued_at: accessExpiresAt,
      expires_at: accessExpiresAt,
      refreshed_at: null,
      last_activity_at: accessExpiresAt,
      created_at: accessExpiresAt,
      updated_at: accessExpiresAt,
      deleted_at: null,
      authenticated_user_id: undefined,
    },
  });

  // 5. Audit log: admin login event
  await MyGlobal.prisma.storyfield_ai_auth_audit_logs.create({
    data: {
      id: v4(),
      token_session_id: sessionId,
      authenticated_user_id: undefined,
      system_admin_id: admin.id,
      event_type: "issued",
      event_outcome: "success",
      event_message: "systemAdmin login",
      source_ip: undefined,
      user_agent: undefined,
      created_at: accessExpiresAt,
    },
  });

  // 6. Return authorized session info. Null/undefined handled for optional fields.
  return {
    id: admin.id,
    external_admin_id: admin.external_admin_id,
    email: admin.email,
    actor_type: "systemAdmin",
    last_login_at: nowDate ?? undefined,
    admin_notes: admin.admin_notes ?? undefined,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at
      ? toISOStringSafe(admin.deleted_at)
      : undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
}
