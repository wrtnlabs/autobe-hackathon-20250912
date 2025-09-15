import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Update a specific comment on a task.
 *
 * This operation requires the unique taskId and commentId path parameters. Only
 * authorized users who are the original commenters may perform this update.
 *
 * @param props - Object containing pm authentication, taskId, commentId, and
 *   update body.
 * @param props.pm - The authenticated project manager performing the update.
 * @param props.taskId - UUID of the task to which the comment belongs.
 * @param props.commentId - UUID of the comment to update.
 * @param props.body - Partial update data for the task comment.
 * @returns The updated task comment with all details.
 * @throws {Error} Throws error when the comment does not exist or unauthorized
 *   access.
 */
export async function puttaskManagementPmTasksTaskIdCommentsCommentId(props: {
  pm: PmPayload;
  taskId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskComment.IUpdate;
}): Promise<ITaskManagementTaskComment> {
  const { pm, taskId, commentId, body } = props;

  // Fetch the existing comment ensuring it belongs to the given task
  const existing =
    await MyGlobal.prisma.task_management_task_comments.findFirstOrThrow({
      where: {
        id: commentId,
        task_id: taskId,
      },
    });

  // Authorization check: Only the original commenter can update
  if (existing.commenter_id !== pm.id) {
    throw new Error(
      "Unauthorized: Only the original commenter can update this comment.",
    );
  }

  // Update the comment with provided fields
  const updated = await MyGlobal.prisma.task_management_task_comments.update({
    where: { id: commentId },
    data: {
      comment_body: body.comment_body ?? undefined,
      updated_at: body.updated_at ?? undefined,
      deleted_at: body.deleted_at ?? undefined,
    },
  });

  // Return updated comment data, converting dates properly
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
