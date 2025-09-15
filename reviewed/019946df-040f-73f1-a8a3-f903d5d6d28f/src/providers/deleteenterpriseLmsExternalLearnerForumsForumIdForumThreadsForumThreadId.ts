import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ExternallearnerPayload } from "../decorators/payload/ExternallearnerPayload";

/**
 * Soft delete a forum thread identified by 'forumThreadId' inside forum
 * 'forumId'.
 *
 * This operation marks the thread as deleted by setting the 'deleted_at'
 * timestamp.
 *
 * Authorization granted to roles: systemAdmin, organizationAdmin,
 * departmentManager, contentCreatorInstructor, corporateLearner,
 * externalLearner, and guest.
 *
 * Soft deletion preserves data for audit and compliance within multi-tenant
 * architecture.
 *
 * @param props - Object containing the externalLearner payload and identifiers
 * @param props.externalLearner - The authenticated external learner user making
 *   the request
 * @param props.forumId - UUID of the forum containing the thread
 * @param props.forumThreadId - UUID of the thread to be soft deleted
 * @throws {Error} When the forum or thread does not exist or access is
 *   unauthorized
 */
export async function deleteenterpriseLmsExternalLearnerForumsForumIdForumThreadsForumThreadId(props: {
  externalLearner: ExternallearnerPayload;
  forumId: string & tags.Format<"uuid">;
  forumThreadId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { externalLearner, forumId, forumThreadId } = props;

  // Verify that the forum exists
  await MyGlobal.prisma.enterprise_lms_forums.findUniqueOrThrow({
    where: { id: forumId },
  });

  // Verify that the forum thread exists and belongs to the forum and is not already deleted
  await MyGlobal.prisma.enterprise_lms_forum_threads.findFirstOrThrow({
    where: {
      id: forumThreadId,
      forum_id: forumId,
      deleted_at: null,
    },
  });

  // Soft delete the forum thread by setting deleted_at timestamp
  const deletedAt = toISOStringSafe(new Date());

  await MyGlobal.prisma.enterprise_lms_forum_threads.update({
    where: { id: forumThreadId },
    data: { deleted_at: deletedAt },
  });
}
