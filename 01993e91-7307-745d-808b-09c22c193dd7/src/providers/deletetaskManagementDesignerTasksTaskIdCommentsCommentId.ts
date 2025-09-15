import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Delete (soft delete) a comment on a task.
 *
 * This operation soft deletes the comment identified by taskId and commentId.
 * Only the original commenter (designer) can delete their own comment. On
 * successful deletion, the deleted_at timestamp is set.
 *
 * @param props - Object containing authorization designer and identifiers
 * @param props.designer - The authenticated designer user performing the
 *   deletion
 * @param props.taskId - UUID of the task associated with the comment
 * @param props.commentId - UUID of the comment to be deleted
 * @throws {Error} Throws error if the comment does not exist
 * @throws {Error} Throws error if the designer is not authorized to delete the
 *   comment
 */
export async function deletetaskManagementDesignerTasksTaskIdCommentsCommentId(props: {
  designer: DesignerPayload;
  taskId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { designer, taskId, commentId } = props;

  // Find the comment that matches taskId, commentId and is not deleted
  const comment = await MyGlobal.prisma.task_management_task_comments.findFirst(
    {
      where: {
        id: commentId,
        task_id: taskId,
        deleted_at: null,
      },
    },
  );

  if (comment === null) {
    throw new Error("Comment not found");
  }

  // Check if the designer is the original commenter
  if (comment.commenter_id !== designer.id) {
    throw new Error(
      "Unauthorized: only the original commenter can delete this comment",
    );
  }

  // Obtain the current timestamp in ISO string format
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Perform the soft delete by updating deleted_at
  await MyGlobal.prisma.task_management_task_comments.update({
    where: { id: commentId },
    data: { deleted_at: now },
  });
}
