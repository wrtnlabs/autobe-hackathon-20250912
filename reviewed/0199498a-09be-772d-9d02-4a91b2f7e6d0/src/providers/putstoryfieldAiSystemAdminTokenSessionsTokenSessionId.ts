import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiTokenSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiTokenSession";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update a specific authentication token session's allowed fields by ID (admin
 * only)
 *
 * This operation allows system administrators to update mutable session fields
 * like expiry, fingerprint, refreshed_at, or soft-delete. Ownership and
 * sensitive token values cannot be modified by this method. The update applies
 * only to the single session identified by ID. Throws if session not found.
 *
 * @param props - SystemAdmin: SystemadminPayload - authenticated admin
 *   tokenSessionId: string & tags.Format<'uuid'> - ID of the token session
 *   body: IStoryfieldAiTokenSession.IUpdate - allowed session fields to update
 * @returns Updated IStoryfieldAiTokenSession object.
 * @throws {Error} When no session is found with provided ID
 */
export async function putstoryfieldAiSystemAdminTokenSessionsTokenSessionId(props: {
  systemAdmin: SystemadminPayload;
  tokenSessionId: string & tags.Format<"uuid">;
  body: IStoryfieldAiTokenSession.IUpdate;
}): Promise<IStoryfieldAiTokenSession> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.storyfield_ai_token_sessions.update({
    where: { id: props.tokenSessionId },
    data: {
      expires_at: props.body.expires_at ?? undefined,
      refreshed_at: props.body.refreshed_at ?? undefined,
      last_activity_at: props.body.last_activity_at ?? undefined,
      fingerprint: props.body.fingerprint ?? undefined,
      deleted_at: props.body.deleted_at ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    authenticated_user_id: updated.authenticated_user_id ?? undefined,
    system_admin_id: updated.system_admin_id ?? undefined,
    token_hash: updated.token_hash,
    fingerprint: updated.fingerprint,
    issued_at: toISOStringSafe(updated.issued_at),
    expires_at: toISOStringSafe(updated.expires_at),
    refreshed_at:
      updated.refreshed_at != null
        ? toISOStringSafe(updated.refreshed_at)
        : undefined,
    last_activity_at: toISOStringSafe(updated.last_activity_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at != null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
