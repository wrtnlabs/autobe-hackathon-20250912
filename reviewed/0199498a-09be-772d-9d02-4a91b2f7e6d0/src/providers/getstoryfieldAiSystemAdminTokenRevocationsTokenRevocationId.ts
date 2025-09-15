import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiTokenRevocation } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiTokenRevocation";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * View detailed information about a specific token revocation event
 * (systemAdmin only; storyfield_ai_token_revocations)
 *
 * This endpoint allows system administrators to retrieve the complete details
 * of a specific authentication token revocation event. It provides all relevant
 * audit information, including the responsible admin, related user/session,
 * explicit revocation reason, hashed token value, relevant metadata (IP
 * address, timestamp), and full traceability. Only officially authorized
 * systemAdmin actors can access this for compliance and security
 * investigations. Sensitive fields such as the original token value are never
 * revealed.
 *
 * @param props - Object containing the actor and target event ID for retrieval
 * @param props.systemAdmin - The authenticated system administrator requesting
 *   the revocation event detail
 * @param props.tokenRevocationId - The unique identifier (UUID) of the token
 *   revocation event to return
 * @returns All audit metadata for the given revocation event per the
 *   IStoryfieldAiTokenRevocation schema
 * @throws {Error} If the specified token revocation event does not exist or
 *   access is not permitted
 */
export async function getstoryfieldAiSystemAdminTokenRevocationsTokenRevocationId(props: {
  systemAdmin: SystemadminPayload;
  tokenRevocationId: string & tags.Format<"uuid">;
}): Promise<IStoryfieldAiTokenRevocation> {
  const row =
    await MyGlobal.prisma.storyfield_ai_token_revocations.findUniqueOrThrow({
      where: { id: props.tokenRevocationId },
      select: {
        id: true,
        token_session_id: true,
        authenticated_user_id: true,
        system_admin_id: true,
        token_hash: true,
        revoked_reason: true,
        revoked_by_ip: true,
        created_at: true,
      },
    });
  return {
    id: row.id,
    token_session_id:
      row.token_session_id === null ? undefined : row.token_session_id,
    authenticated_user_id:
      row.authenticated_user_id === null
        ? undefined
        : row.authenticated_user_id,
    system_admin_id:
      row.system_admin_id === null ? undefined : row.system_admin_id,
    token_hash: row.token_hash,
    revoked_reason: row.revoked_reason,
    revoked_by_ip: row.revoked_by_ip === null ? undefined : row.revoked_by_ip,
    created_at: toISOStringSafe(row.created_at),
  };
}
