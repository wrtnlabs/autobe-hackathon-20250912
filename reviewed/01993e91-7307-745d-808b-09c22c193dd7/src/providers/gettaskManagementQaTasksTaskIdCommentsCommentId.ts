import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Retrieves a specific comment on a task by task ID and comment ID.
 *
 * This function fetches the comment details from the database ensuring the
 * comment is not soft deleted.
 *
 * Authorization must be provided by the authenticated QA user in the props.
 *
 * @param props - Properties containing authentication and identifiers.
 * @param props.qa - Authenticated QA user payload.
 * @param props.taskId - UUID of the task.
 * @param props.commentId - UUID of the comment.
 * @returns The task comment matching the specified identifiers.
 * @throws {Error} Throws if no matching comment is found.
 */
export async function gettaskManagementQaTasksTaskIdCommentsCommentId(props: {
  qa: QaPayload;
  taskId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskComment> {
  const { qa, taskId, commentId } = props;

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
