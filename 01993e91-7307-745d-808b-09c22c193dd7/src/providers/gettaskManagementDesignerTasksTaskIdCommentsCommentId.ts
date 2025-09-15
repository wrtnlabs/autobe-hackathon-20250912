import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Get details of a specific comment on a task
 *
 * Retrieves the comment identified by commentId that belongs to the task
 * identified by taskId. Only non-deleted comments are returned (deleted_at is
 * null).
 *
 * Authorization: requires authenticated designer access with viewing rights.
 *
 * @param props - Object containing designer authentication and identifiers
 * @param props.designer - Authenticated designer payload
 * @param props.taskId - UUID string of the task
 * @param props.commentId - UUID string of the comment
 * @returns Detailed comment information conforming to
 *   ITaskManagementTaskComment
 * @throws {Error} If no matching comment is found, or if access is unauthorized
 */
export async function gettaskManagementDesignerTasksTaskIdCommentsCommentId(props: {
  designer: DesignerPayload;
  taskId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskComment> {
  const { taskId, commentId } = props;

  const record =
    await MyGlobal.prisma.task_management_task_comments.findFirstOrThrow({
      where: {
        id: commentId,
        task_id: taskId,
        deleted_at: null,
      },
    });

  return {
    id: record.id,
    task_id: record.task_id,
    commenter_id: record.commenter_id,
    comment_body: record.comment_body,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
