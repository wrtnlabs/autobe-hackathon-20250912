import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Soft delete a forum thread identified by 'forumThreadId' inside forum
 * 'forumId'.
 *
 * This operation marks the thread as deleted by setting the 'deleted_at'
 * timestamp. Authorization granted to roles: systemAdmin, organizationAdmin,
 * departmentManager, contentCreatorInstructor, corporateLearner,
 * externalLearner, and guest.
 *
 * @param props - Object containing systemAdmin authentication, forumId (UUID of
 *   the forum), and forumThreadId (UUID of the thread)
 * @returns Promise<void> - No content response
 * @throws Error if forum thread doesn't exist
 */
export async function deleteenterpriseLmsSystemAdminForumsForumIdForumThreadsForumThreadId(props: {
  systemAdmin: SystemadminPayload;
  forumId: string & tags.Format<"uuid">;
  forumThreadId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, forumId, forumThreadId } = props;

  // Verify the forum thread belongs to the forum
  await MyGlobal.prisma.enterprise_lms_forum_threads.findFirstOrThrow({
    where: {
      id: forumThreadId,
      forum_id: forumId,
    },
  });

  // Soft delete: mark deleted_at timestamp
  await MyGlobal.prisma.enterprise_lms_forum_threads.update({
    where: { id: forumThreadId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
