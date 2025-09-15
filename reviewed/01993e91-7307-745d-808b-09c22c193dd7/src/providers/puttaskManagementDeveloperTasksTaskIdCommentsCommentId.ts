import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Update a specific comment on a task.
 *
 * This operation requires the unique taskId and commentId path parameters.
 *
 * Only the developer who made the comment may perform this operation.
 *
 * The request body may include updated comment text, update timestamp, and soft
 * deletion timestamp.
 *
 * @param props - Object containing developer authentication payload, taskId,
 *   commentId, and update body
 * @returns The updated task comment with all fields and ISO date strings
 * @throws {Error} When the comment does not belong to the developer
 * @throws {Error} When the comment or task does not exist
 */
export async function puttaskManagementDeveloperTasksTaskIdCommentsCommentId(props: {
  developer: DeveloperPayload;
  taskId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskComment.IUpdate;
}): Promise<ITaskManagementTaskComment> {
  const { developer, taskId, commentId, body } = props;

  // Retrieve the comment ensuring it belongs to the given task
  const comment =
    await MyGlobal.prisma.task_management_task_comments.findUniqueOrThrow({
      where: {
        id: commentId,
        task_id: taskId,
      },
    });

  // Authorization check - only the original commenter may update
  if (comment.commenter_id !== developer.id) {
    throw new Error("Unauthorized: You can only update your own comments");
  }

  // Prepare update data with undefined for skipped fields
  const updateData: Partial<ITaskManagementTaskComment.IUpdate> = {
    comment_body: body.comment_body ?? undefined,
    updated_at: body.updated_at ?? undefined,
    deleted_at: body.deleted_at ?? undefined,
  };

  // Perform update
  const updated = await MyGlobal.prisma.task_management_task_comments.update({
    where: { id: commentId },
    data: updateData,
  });

  // Return updated comment with all dates converted properly
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
