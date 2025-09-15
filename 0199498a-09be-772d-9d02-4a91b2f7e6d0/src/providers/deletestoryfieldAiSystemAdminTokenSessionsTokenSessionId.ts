import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Soft-delete (force logout) a specified authentication token session (admin
 * only).
 *
 * This function performs a soft deletion (forced logout) for a specified
 * authentication token session, identified by its UUID. The soft-delete is
 * implemented by setting the session's `deleted_at` timestamp. After this
 * operation, the session is considered invalid for any future authentication or
 * refresh attempts but remains in the database for audit and compliance review.
 * Only accessible by system administrators.
 *
 * If the session is already deleted or does not exist, a compliance error is
 * thrown. No physical deletion occurs. For audit/compliance, insertion of a
 * forced logout log entry is recommended (TODO).
 *
 * @param props - Operation parameters
 * @param props.systemAdmin - The authenticated system administrator performing
 *   this action (authorization enforced)
 * @param props.tokenSessionId - UUID of the target token session to be
 *   soft-deleted
 * @returns Void
 * @throws {Error} If the session does not exist or is already deleted
 */
export async function deletestoryfieldAiSystemAdminTokenSessionsTokenSessionId(props: {
  systemAdmin: SystemadminPayload;
  tokenSessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { tokenSessionId } = props;

  // Fetch the active session, must not be already soft-deleted
  const session = await MyGlobal.prisma.storyfield_ai_token_sessions.findFirst({
    where: {
      id: tokenSessionId,
      deleted_at: null,
    },
  });
  if (session === null) {
    throw new Error("Token session does not exist or is already deleted.");
  }

  // Soft-delete (set deleted_at timestamp as ISO string)
  await MyGlobal.prisma.storyfield_ai_token_sessions.update({
    where: {
      id: tokenSessionId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });

  // TODO: Write audit log for forced admin-initiated logout for compliance & traceability
}
