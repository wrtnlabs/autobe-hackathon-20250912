import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Update a specific comment on a task.
 *
 * This function updates the content and metadata of a comment identified by
 * commentId on the task identified by taskId. Authorization is enforced so that
 * only the TPM user who originally made the comment can perform the update.
 *
 * @param props - The parameters for the update operation, including
 *   authentication, task and comment identifiers, and update data.
 * @param props.tpm - The authenticated TPM user attempting the update.
 * @param props.taskId - UUID of the task to which the comment belongs.
 * @param props.commentId - UUID of the comment to update.
 * @param props.body - The update data for the comment, containing optional
 *   fields such as comment_body, updated_at, and deleted_at timestamps.
 * @returns The updated task comment details with all relevant fields.
 * @throws {Error} Throws if the comment does not belong to the specified task.
 * @throws {Error} Throws if the TPM user is not authorized to update the
 *   comment.
 */
export async function puttaskManagementTpmTasksTaskIdCommentsCommentId(props: {
  tpm: TpmPayload;
  taskId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskComment.IUpdate;
}): Promise<ITaskManagementTaskComment> {
  const { tpm, taskId, commentId, body } = props;

  // Fetch the comment and verify ownership and task association
  const existingComment =
    await MyGlobal.prisma.task_management_task_comments.findUniqueOrThrow({
      where: { id: commentId },
      select: {
        id: true,
        task_id: true,
        commenter_id: true,
        comment_body: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (existingComment.task_id !== taskId) {
    throw new Error("Comment does not belong to the specified task");
  }

  if (existingComment.commenter_id !== tpm.id) {
    throw new Error(
      "Unauthorized: Only the original commenter can update this comment",
    );
  }

  // Update the comment with provided data
  const updatedComment =
    await MyGlobal.prisma.task_management_task_comments.update({
      where: { id: commentId },
      data: {
        comment_body: body.comment_body ?? undefined,
        updated_at:
          body.updated_at === null ? null : (body.updated_at ?? undefined),
        deleted_at:
          body.deleted_at === null ? null : (body.deleted_at ?? undefined),
      },
    });

  // Return updated comment with date fields converted properly
  return {
    id: updatedComment.id,
    task_id: updatedComment.task_id,
    commenter_id: updatedComment.commenter_id,
    comment_body: updatedComment.comment_body,
    created_at: toISOStringSafe(updatedComment.created_at),
    updated_at: toISOStringSafe(updatedComment.updated_at),
    deleted_at: updatedComment.deleted_at
      ? toISOStringSafe(updatedComment.deleted_at)
      : null,
  };
}
