import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Update a specific comment on a task.
 *
 * This operation updates the comment body, updated_at, and deleted_at fields of
 * a task comment. Requires that the authenticated designer is the original
 * commenter of the comment. Validates the task and comment association.
 *
 * @param props - Object containing designer authentication, taskId, commentId,
 *   and update body
 * @param props.designer - Authenticated designer user making the request
 * @param props.taskId - UUID of the task the comment belongs to
 * @param props.commentId - UUID of the comment to update
 * @param props.body - Update fields for the comment
 * @returns The updated task comment with proper date formatting
 * @throws {Error} When the comment does not exist
 * @throws {Error} When the authenticated designer is not the owner of the
 *   comment
 */
export async function puttaskManagementDesignerTasksTaskIdCommentsCommentId(props: {
  designer: DesignerPayload;
  taskId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskComment.IUpdate;
}): Promise<ITaskManagementTaskComment> {
  const { designer, taskId, commentId, body } = props;

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
    throw new Error("Comment not found");
  }

  if (comment.commenter_id !== designer.id) {
    throw new Error("Not authorized");
  }

  const updated = await MyGlobal.prisma.task_management_task_comments.update({
    where: { id: commentId },
    data: {
      comment_body: body.comment_body ?? undefined,
      updated_at: body.updated_at
        ? toISOStringSafe(body.updated_at)
        : toISOStringSafe(new Date()),
      deleted_at: body.deleted_at === undefined ? undefined : body.deleted_at,
    },
  });

  return {
    id: updated.id,
    task_id: updated.task_id,
    commenter_id: updated.commenter_id,
    comment_body: updated.comment_body,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
