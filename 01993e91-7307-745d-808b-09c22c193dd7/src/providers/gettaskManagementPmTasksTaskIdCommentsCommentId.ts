import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Get details of a specific comment on a task.
 *
 * This operation retrieves a specific comment associated with a task identified
 * by taskId and commentId. It fetches the comment details from the
 * task_management_task_comments table, including comment body, commenter
 * reference, timestamps, and soft deletion status. Only existing, non-deleted
 * comments are returned.
 *
 * Authorization is required and typically granted to authenticated users who
 * have permission to view task comments.
 *
 * @param props - Object containing pm authentication and identifiers
 * @param props.pm - The authenticated Project Manager
 * @param props.taskId - UUID of the task
 * @param props.commentId - UUID of the comment
 * @returns The detailed comment information
 * @throws {Error} Throws if comment not found or unauthorized access
 */
export async function gettaskManagementPmTasksTaskIdCommentsCommentId(props: {
  pm: PmPayload;
  taskId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskComment> {
  const { pm, taskId, commentId } = props;

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
