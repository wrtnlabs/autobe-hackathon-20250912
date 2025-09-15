import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Soft delete a comment on a task by marking its deleted_at field with the
 * current timestamp.
 *
 * Only the original commenter (developer) is authorized to perform this
 * operation.
 *
 * @param props - Parameters including the developer payload, taskId and
 *   commentId
 * @throws {Error} When the comment does not exist or the user is unauthorized
 */
export async function deletetaskManagementDeveloperTasksTaskIdCommentsCommentId(props: {
  developer: DeveloperPayload;
  taskId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const comment = await MyGlobal.prisma.task_management_task_comments.findFirst(
    {
      where: {
        task_id: props.taskId,
        id: props.commentId,
        deleted_at: null,
      },
    },
  );

  if (!comment) {
    throw new Error("Comment not found");
  }

  if (comment.commenter_id !== props.developer.id) {
    throw new Error("Unauthorized: You can only delete your own comments");
  }

  const deletedAt = toISOStringSafe(new Date());

  await MyGlobal.prisma.task_management_task_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: deletedAt,
      updated_at: deletedAt,
    },
  });
}
