import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiTokenSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiTokenSession";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get detailed information on an authentication token session by ID (admin
 * only)
 *
 * Retrieve all detailed information for a specified authentication token
 * session. This endpoint fetches the complete storyfield_ai_token_sessions
 * record by tokenSessionId, allowing system administrators to audit session
 * history, troubleshoot security incidents, resolve user access problems, or
 * validate session lifecycle compliance.
 *
 * Only systemAdmin users may access this operation. If the token session is
 * non-existent, an error is thrown. All fields are mapped one-to-one to the
 * Prisma model, with all date values provided as ISO8601 strings.
 *
 * @param props - Parameters for the request
 * @param props.systemAdmin - Authenticated SystemadminPayload performing this
 *   action; must be a valid, active admin
 * @param props.tokenSessionId - Unique identifier (UUID) of the target
 *   authentication token session
 * @returns Full detail of the specified authentication token session
 * @throws {Error} If the session does not exist
 */
export async function getstoryfieldAiSystemAdminTokenSessionsTokenSessionId(props: {
  systemAdmin: SystemadminPayload;
  tokenSessionId: string & tags.Format<"uuid">;
}): Promise<IStoryfieldAiTokenSession> {
  const session = await MyGlobal.prisma.storyfield_ai_token_sessions.findUnique(
    {
      where: { id: props.tokenSessionId },
    },
  );
  if (!session) {
    throw new Error("Token session not found");
  }
  return {
    id: session.id,
    authenticated_user_id: session.authenticated_user_id ?? undefined,
    system_admin_id: session.system_admin_id ?? undefined,
    token_hash: session.token_hash,
    fingerprint: session.fingerprint,
    issued_at: toISOStringSafe(session.issued_at),
    expires_at: toISOStringSafe(session.expires_at),
    refreshed_at: session.refreshed_at
      ? toISOStringSafe(session.refreshed_at)
      : undefined,
    last_activity_at: toISOStringSafe(session.last_activity_at),
    created_at: toISOStringSafe(session.created_at),
    updated_at: toISOStringSafe(session.updated_at),
    deleted_at: session.deleted_at
      ? toISOStringSafe(session.deleted_at)
      : undefined,
  };
}
