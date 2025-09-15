import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Get details of a specific comment on a task
 *
 * Retrieves a comment by its unique commentId and associated taskId. Only
 * active (non-soft-deleted) comments are returned. Requires PMO user
 * authorization.
 *
 * @param props - Contains pmo authentication payload, taskId, and commentId
 * @returns The comment details as ITaskManagementTaskComment
 * @throws Error if the comment does not exist or is soft-deleted
 */
export async function gettaskManagementPmoTasksTaskIdCommentsCommentId(props: {
  pmo: PmoPayload;
  taskId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskComment> {
  const { pmo, taskId, commentId } = props;

  const comment =
    await MyGlobal.prisma.task_management_task_comments.findFirstOrThrow({
      where: {
        id: commentId,
        task_id: taskId,
        deleted_at: null,
      },
    });

  return {
    id: comment.id,
    task_id: comment.task_id,
    commenter_id: comment.commenter_id,
    comment_body: comment.comment_body,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at ? toISOStringSafe(comment.deleted_at) : null,
  };
}
