import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Soft deletes a comment on a task for a PM user.
 *
 * Marks the comment as deleted by setting its deleted_at timestamp to the
 * current time. Only the original commenter (PM user) can perform this
 * operation.
 *
 * @param props - Contains PM payload and identifiers for the task and comment.
 * @param props.pm - The authenticated PM user payload.
 * @param props.taskId - UUID of the task containing the comment.
 * @param props.commentId - UUID of the comment to be soft deleted.
 * @throws {Error} Throws if the comment does not exist or is already deleted.
 * @throws {Error} Throws if the PM user is not authorized to delete the
 *   comment.
 */
export async function deletetaskManagementPmTasksTaskIdCommentsCommentId(props: {
  pm: PmPayload;
  taskId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { pm, taskId, commentId } = props;

  const comment = await MyGlobal.prisma.task_management_task_comments.findFirst(
    {
      where: {
        id: commentId,
        task_id: taskId,
        deleted_at: null,
      },
    },
  );

  if (!comment) {
    throw new Error("Comment not found or already deleted");
  }

  if (comment.commenter_id !== pm.id) {
    throw new Error("Unauthorized: You can only delete your own comments");
  }

  const deletedAt = toISOStringSafe(new Date());

  await MyGlobal.prisma.task_management_task_comments.update({
    where: { id: commentId },
    data: { deleted_at: deletedAt },
  });
}
