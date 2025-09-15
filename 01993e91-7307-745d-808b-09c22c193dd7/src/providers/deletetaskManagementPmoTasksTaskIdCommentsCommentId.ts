import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Soft delete a comment on a task by marking its deleted_at field with the
 * current timestamp.
 *
 * Only authorized PMO users may perform this operation.
 *
 * @param props - Object containing properties:
 *
 *   - Pmo: Authenticated PMO payload
 *   - TaskId: UUID of the task
 *   - CommentId: UUID of the comment
 *
 * @throws {Error} If the comment doesn't exist or does not belong to the
 *   specified task
 */
export async function deletetaskManagementPmoTasksTaskIdCommentsCommentId(props: {
  pmo: PmoPayload;
  taskId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { pmo, taskId, commentId } = props;

  // Get the comment record or throw if not found
  const comment =
    await MyGlobal.prisma.task_management_task_comments.findUniqueOrThrow({
      where: { id: commentId },
    });

  // Verify comment belongs to the given task
  if (comment.task_id !== taskId) {
    throw new Error("Comment does not belong to the specified task");
  }

  // Soft delete by setting the deleted_at timestamp
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.task_management_task_comments.update({
    where: { id: commentId },
    data: { deleted_at: now },
  });
}
