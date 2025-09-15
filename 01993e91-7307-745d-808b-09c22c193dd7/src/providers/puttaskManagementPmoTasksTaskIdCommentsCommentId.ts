import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Update a specific comment on a task.
 *
 * This operation updates the comment content and timing metadata on a task
 * comment. It requires the PMO user to be the original commenter for
 * authorization. The comment must belong to the specified task.
 *
 * @param props - Object containing authentication, path parameters, and body
 *   for update
 * @param props.pmo - Authenticated PMO user performing the update
 * @param props.taskId - UUID of the task the comment belongs to
 * @param props.commentId - UUID of the comment to update
 * @param props.body - Request body containing fields to update
 * @returns The updated comment record
 * @throws {Error} When the comment does not belong to the specified task
 * @throws {Error} When the user is not authorized to update the comment
 * @throws {Error} When the comment is not found
 */
export async function puttaskManagementPmoTasksTaskIdCommentsCommentId(props: {
  pmo: PmoPayload;
  taskId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskComment.IUpdate;
}): Promise<ITaskManagementTaskComment> {
  const { pmo, taskId, commentId, body } = props;

  // Fetch the comment and verify existence
  const comment =
    await MyGlobal.prisma.task_management_task_comments.findUniqueOrThrow({
      where: { id: commentId },
    });

  // Verify the comment belongs to the specified task
  if (comment.task_id !== taskId) {
    throw new Error("Comment does not belong to the specified task");
  }

  // Authorization check - only the original commenter can update
  if (comment.commenter_id !== pmo.id) {
    throw new Error("Unauthorized: You are not the commenter");
  }

  // Update the comment record with provided fields
  const updated = await MyGlobal.prisma.task_management_task_comments.update({
    where: { id: commentId },
    data: {
      comment_body: body.comment_body ?? undefined,
      updated_at: body.updated_at ?? toISOStringSafe(new Date()),
      deleted_at: body.deleted_at ?? undefined,
    },
  });

  // Return the updated comment with proper date conversions
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
