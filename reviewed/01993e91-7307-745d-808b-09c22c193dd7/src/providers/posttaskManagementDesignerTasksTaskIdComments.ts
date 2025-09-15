import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Create a new comment for a task
 *
 * This operation allows an authenticated Designer to add a new comment to a
 * specific task. The taskId path parameter associates the comment with the
 * correct task. The request body must include the comment content and commenter
 * ID.
 *
 * @param props - Object containing designer authentication info, taskId path
 *   parameter, and comment creation body
 * @returns The newly created task comment with all metadata
 * @throws {Error} When taskId in path and body do not match
 * @throws {Error} When the referenced task does not exist
 */
export async function posttaskManagementDesignerTasksTaskIdComments(props: {
  designer: DesignerPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskComment.ICreate;
}): Promise<ITaskManagementTaskComment> {
  const { designer, taskId, body } = props;

  if (body.task_id !== taskId) {
    throw new Error("Task ID in path and body do not match.");
  }

  const taskExists = await MyGlobal.prisma.task_management_tasks.findUnique({
    where: {
      id: taskId,
    },
    select: { id: true },
  });

  if (!taskExists) {
    throw new Error("Task not found.");
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const newId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;

  const created = await MyGlobal.prisma.task_management_task_comments.create({
    data: {
      id: newId,
      task_id: taskId,
      commenter_id: body.commenter_id,
      comment_body: body.comment_body,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    task_id: created.task_id,
    commenter_id: created.commenter_id,
    comment_body: created.comment_body,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
