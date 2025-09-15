import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Soft delete a forum thread identified by 'forumThreadId' inside forum
 * 'forumId'.
 *
 * This operation marks the thread as deleted by setting the 'deleted_at'
 * timestamp. Authorization is granted only to the authoring corporate learner.
 *
 * @param props - Object containing corporateLearner payload, forumId and
 *   forumThreadId.
 * @param props.corporateLearner - The authenticated corporate learner
 *   initiating the deletion.
 * @param props.forumId - UUID of the target forum.
 * @param props.forumThreadId - UUID of the forum thread to delete.
 * @returns Void
 * @throws {Error} When the forum thread does not exist or is already deleted.
 * @throws {Error} When the authenticated user is not the author of the thread.
 */
export async function deleteenterpriseLmsCorporateLearnerForumsForumIdForumThreadsForumThreadId(props: {
  corporateLearner: CorporatelearnerPayload;
  forumId: string & tags.Format<"uuid">;
  forumThreadId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { corporateLearner, forumId, forumThreadId } = props;

  const thread = await MyGlobal.prisma.enterprise_lms_forum_threads.findFirst({
    where: {
      id: forumThreadId,
      forum_id: forumId,
      deleted_at: null,
    },
  });

  if (!thread) {
    throw new Error("Forum thread not found");
  }

  if (thread.author_id !== corporateLearner.id) {
    throw new Error("Unauthorized: You can only delete your own forum threads");
  }

  await MyGlobal.prisma.enterprise_lms_forum_threads.update({
    where: { id: forumThreadId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
