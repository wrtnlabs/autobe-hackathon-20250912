import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Soft delete a comment on a task by marking its deleted_at field with the
 * current timestamp.
 *
 * Only the original commenter (QA user) is authorized to perform this
 * operation.
 *
 * @param props - Object containing authentication and identifiers
 * @param props.qa - Authenticated QA user performing the deletion
 * @param props.taskId - UUID of the task associated with the comment
 * @param props.commentId - UUID of the comment to delete
 * @throws {Error} If the comment does not exist or is already deleted
 * @throws {Error} If the authenticated user is not authorized to delete the
 *   comment
 */
export async function deletetaskManagementQaTasksTaskIdCommentsCommentId(props: {
  qa: QaPayload;
  taskId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { qa, taskId, commentId } = props;

  const comment =
    await MyGlobal.prisma.task_management_task_comments.findFirstOrThrow({
      where: {
        id: commentId,
        task_id: taskId,
        deleted_at: null,
      },
    });

  if (comment.commenter_id !== qa.id) {
    throw new Error(
      "Unauthorized: only the comment author can delete this comment",
    );
  }

  const deleted_at = toISOStringSafe(new Date());

  await MyGlobal.prisma.task_management_task_comments.update({
    where: { id: commentId },
    data: { deleted_at },
  });
}
