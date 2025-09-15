import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Refresh JWT access token for systemAdmin using valid active refresh
 * token/session.
 *
 * This endpoint validates the refresh token for an active, non-revoked token
 * session tied to a system administrator. It issues a new JWT access and
 * refresh token, updates session lifecycle fields, and writes an audit event.
 * It strictly enforces session, soft-deletion, and revocation checks, ensuring
 * only active, privileged sessions are refreshed.
 *
 * @param props - Request props containing the empty IRefresh body (actual token
 *   provided in HTTP context)
 * @returns Fully authorized system admin DTO with renewed tokens
 * @throws {Error} If the refresh token is missing, expired, revoked, or not
 *   linked to an active system admin.
 */
export async function postauthSystemAdminRefresh(props: {
  body: IStoryfieldAiSystemAdmin.IRefresh;
}): Promise<IStoryfieldAiSystemAdmin.IAuthorized> {
  // Extract refresh token from context (must be present in request headers)
  const refreshToken: string = MyGlobal.getRefreshTokenFromContext();
  if (!refreshToken) {
    await MyGlobal.prisma.storyfield_ai_auth_audit_logs.create({
      data: {
        id: v4(),
        token_session_id: null,
        system_admin_id: null,
        event_type: "refresh_denied",
        event_outcome: "failure",
        event_message: "Missing refresh token in request",
        source_ip: MyGlobal.getSourceIP(),
        user_agent: MyGlobal.getUserAgent(),
        created_at: toISOStringSafe(new Date()),
      },
    });
    throw new Error("Missing refresh token");
  }

  // Attempt to decode and verify the JWT
  let decoded: unknown;
  try {
    decoded = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (err) {
    await MyGlobal.prisma.storyfield_ai_auth_audit_logs.create({
      data: {
        id: v4(),
        token_session_id: null,
        system_admin_id: null,
        event_type: "refresh_denied",
        event_outcome: "failure",
        event_message: `Invalid refresh token: ${err instanceof Error ? err.message : String(err)}`,
        source_ip: MyGlobal.getSourceIP(),
        user_agent: MyGlobal.getUserAgent(),
        created_at: toISOStringSafe(new Date()),
      },
    });
    throw new Error("Invalid or expired refresh token");
  }

  // Hash the presented refresh token for DB lookup
  const tokenHash: string = await MyGlobal.password.hash(refreshToken);
  // Find the active session (non-deleted, not expired, systemAdmin-linked)
  const nowIso = toISOStringSafe(new Date());
  const session = await MyGlobal.prisma.storyfield_ai_token_sessions.findFirst({
    where: {
      token_hash: tokenHash,
      deleted_at: null,
      system_admin_id: { not: null },
      expires_at: { gt: nowIso },
    },
  });
  if (!session) {
    await MyGlobal.prisma.storyfield_ai_auth_audit_logs.create({
      data: {
        id: v4(),
        token_session_id: null,
        system_admin_id: null,
        event_type: "refresh_denied",
        event_outcome: "failure",
        event_message:
          "Token session not found, expired, deleted, not admin-linked, or already ended.",
        source_ip: MyGlobal.getSourceIP(),
        user_agent: MyGlobal.getUserAgent(),
        created_at: nowIso,
      },
    });
    throw new Error("Token session not active");
  }

  // Check for token revocation (deny-list)
  const revocation =
    await MyGlobal.prisma.storyfield_ai_token_revocations.findUnique({
      where: { token_hash: tokenHash },
    });
  if (revocation) {
    await MyGlobal.prisma.storyfield_ai_auth_audit_logs.create({
      data: {
        id: v4(),
        token_session_id: session.id,
        system_admin_id: session.system_admin_id,
        event_type: "refresh_denied",
        event_outcome: "failure",
        event_message: "Refresh token was revoked (deny-list)",
        source_ip: MyGlobal.getSourceIP(),
        user_agent: MyGlobal.getUserAgent(),
        created_at: nowIso,
      },
    });
    throw new Error("Refresh token has been revoked");
  }

  // Lookup the current system admin, ensure not deleted
  const adminRow = await MyGlobal.prisma.storyfield_ai_systemadmins.findFirst({
    where: {
      id: session.system_admin_id,
      deleted_at: null,
    },
  });
  if (!adminRow) {
    await MyGlobal.prisma.storyfield_ai_auth_audit_logs.create({
      data: {
        id: v4(),
        token_session_id: session.id,
        system_admin_id: session.system_admin_id,
        event_type: "refresh_denied",
        event_outcome: "failure",
        event_message: "System admin for session not found or was deleted",
        source_ip: MyGlobal.getSourceIP(),
        user_agent: MyGlobal.getUserAgent(),
        created_at: nowIso,
      },
    });
    throw new Error("Admin account not active");
  }

  // Generate new tokens
  const issuedAt = toISOStringSafe(new Date());
  const accessTokenExpiryDate = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const expiresAtIso: string & tags.Format<"date-time"> = toISOStringSafe(
    accessTokenExpiryDate,
  );
  const refreshableUntilIso: string & tags.Format<"date-time"> =
    toISOStringSafe(refreshExpiryDate);
  const accessPayload = {
    id: adminRow.id,
    type: "systemAdmin",
  };
  const newAccessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: 60 * 60, // 1 hour in seconds
    issuer: "autobe",
  });
  const newRefreshToken = jwt.sign(
    { sessionId: session.id, type: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: 7 * 24 * 60 * 60, issuer: "autobe" }, // 7 days in seconds
  );
  // Update session: refreshed_at/last_activity_at
  await MyGlobal.prisma.storyfield_ai_token_sessions.update({
    where: { id: session.id },
    data: {
      refreshed_at: issuedAt,
      last_activity_at: issuedAt,
    },
  });
  // Write audit log for refresh event
  await MyGlobal.prisma.storyfield_ai_auth_audit_logs.create({
    data: {
      id: v4(),
      token_session_id: session.id,
      system_admin_id: session.system_admin_id,
      event_type: "refreshed",
      event_outcome: "success",
      event_message: "System admin token refreshed",
      source_ip: MyGlobal.getSourceIP(),
      user_agent: MyGlobal.getUserAgent(),
      created_at: issuedAt,
    },
  });
  // Compose response
  return {
    id: adminRow.id,
    external_admin_id: adminRow.external_admin_id,
    email: adminRow.email,
    actor_type: "systemAdmin",
    last_login_at: adminRow.last_login_at
      ? toISOStringSafe(adminRow.last_login_at)
      : undefined,
    admin_notes: adminRow.admin_notes ?? undefined,
    created_at: toISOStringSafe(adminRow.created_at),
    updated_at: toISOStringSafe(adminRow.updated_at),
    deleted_at: adminRow.deleted_at
      ? toISOStringSafe(adminRow.deleted_at)
      : undefined,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: expiresAtIso,
      refreshable_until: refreshableUntilIso,
    },
  };
}
