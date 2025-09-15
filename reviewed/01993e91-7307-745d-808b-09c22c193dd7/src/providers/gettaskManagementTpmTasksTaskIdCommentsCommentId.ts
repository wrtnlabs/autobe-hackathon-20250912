import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Get details of a specific comment on a task.
 *
 * This operation retrieves a non-deleted comment associated with a given task
 * and comment ID. Only authorized TPM users can access this comment.
 *
 * @param props - Object containing TPM user payload, taskId and commentId
 * @param props.tpm - Authenticated TPM user's payload
 * @param props.taskId - UUID of the target task
 * @param props.commentId - UUID of the target comment
 * @returns The comment details including id, task_id, commenter_id,
 *   comment_body, timestamps, and soft-delete status
 * @throws {Error} Throws if the comment does not exist or is deleted
 */
export async function gettaskManagementTpmTasksTaskIdCommentsCommentId(props: {
  tpm: TpmPayload;
  taskId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskComment> {
  const { tpm, taskId, commentId } = props;

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
