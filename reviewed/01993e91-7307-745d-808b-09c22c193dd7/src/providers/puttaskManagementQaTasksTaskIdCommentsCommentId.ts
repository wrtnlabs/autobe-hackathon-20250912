import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Update a specific comment on a task.
 *
 * This operation verifies that the comment exists, belongs to the specified
 * task, and that the requesting QA user is the original commenter. It processes
 * optional updates to the comment content and timing metadata, ensuring all
 * date-times are correctly formatted as strings.
 *
 * @param props - Object containing qa payload, taskId, commentId, and update
 *   body
 * @returns The updated task comment with all fields reflecting the latest state
 * @throws {Error} When the comment does not exist
 * @throws {Error} When the comment does not belong to the task
 * @throws {Error} When the qa user is unauthorized to update the comment
 */
export async function puttaskManagementQaTasksTaskIdCommentsCommentId(props: {
  qa: QaPayload;
  taskId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskComment.IUpdate;
}): Promise<ITaskManagementTaskComment> {
  const { qa, taskId, commentId, body } = props;

  const comment =
    await MyGlobal.prisma.task_management_task_comments.findUnique({
      where: { id: commentId },
    });

  if (!comment) throw new Error("Comment not found");

  if (comment.task_id !== taskId) {
    throw new Error("Comment does not belong to the specified task");
  }

  if (comment.commenter_id !== qa.id) {
    throw new Error("Unauthorized to update this comment");
  }

  const nowISO: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const data: {
    comment_body?: string | null;
    updated_at?: (string & tags.Format<"date-time">) | null;
    deleted_at?: (string & tags.Format<"date-time">) | null;
  } = {};

  if (body.comment_body !== undefined) {
    data.comment_body = body.comment_body;
  }

  if (body.updated_at !== undefined) {
    data.updated_at = body.updated_at;
  }

  if (body.deleted_at !== undefined) {
    data.deleted_at = body.deleted_at ?? null;
  }

  if (data.updated_at === undefined) {
    data.updated_at = nowISO;
  }

  const updated = await MyGlobal.prisma.task_management_task_comments.update({
    where: { id: commentId },
    data: data,
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
