import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Soft delete a comment on a task by marking its deleted_at field with the
 * current timestamp.
 *
 * Only the original commenter (TPM user) is authorized to perform this
 * operation.
 *
 * @param props - Object containing TPM user info and identifiers for task and
 *   comment
 * @param props.tpm - The authenticated TPM user performing the deletion
 * @param props.taskId - UUID of the task where the comment belongs
 * @param props.commentId - UUID of the comment to be soft deleted
 * @throws {Error} When the comment does not exist or is already deleted
 * @throws {Error} When the user is not authorized to delete the comment
 */
export async function deletetaskManagementTpmTasksTaskIdCommentsCommentId(props: {
  tpm: TpmPayload;
  taskId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { tpm, taskId, commentId } = props;

  // Find the comment that matches taskId and commentId and is not soft-deleted
  const comment = await MyGlobal.prisma.task_management_task_comments.findFirst(
    {
      where: { id: commentId, task_id: taskId, deleted_at: null },
    },
  );

  if (!comment) {
    throw new Error("Comment not found or already deleted.");
  }

  // Check authorization: only commenter can delete
  if (comment.commenter_id !== tpm.id) {
    throw new Error("Unauthorized to delete this comment.");
  }

  // Soft delete by setting deleted_at timestamp
  const deletedAt = toISOStringSafe(new Date());

  await MyGlobal.prisma.task_management_task_comments.update({
    where: { id: commentId },
    data: { deleted_at: deletedAt },
  });
}
