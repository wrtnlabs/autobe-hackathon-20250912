import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Get details of a specific comment on a task
 *
 * This operation retrieves a comment by its ID and ensures it belongs to the
 * specified task and is not deleted (soft delete check). Only authorized
 * developers can perform this query.
 *
 * @param props - Object containing the developer payload and identifiers for
 *   task and comment
 * @param props.developer - Authenticated developer making the request
 * @param props.taskId - UUID of the task associated with the comment
 * @param props.commentId - UUID of the specific comment to retrieve
 * @returns The comment detail matching the criteria
 * @throws {Error} Throws if comment is not found or unauthorized
 */
export async function gettaskManagementDeveloperTasksTaskIdCommentsCommentId(props: {
  developer: DeveloperPayload;
  taskId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskComment> {
  const { developer, taskId, commentId } = props;

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
