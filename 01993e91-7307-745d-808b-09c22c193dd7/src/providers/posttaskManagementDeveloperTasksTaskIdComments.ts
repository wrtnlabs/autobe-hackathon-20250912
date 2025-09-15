import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Creates a new comment on a specific task in the task_management_task_comments
 * table.
 *
 * This operation requires an authenticated developer user and associates the
 * comment with the specified task. The content of the comment must be non-empty
 * and is provided in the request body along with the commenter reference.
 *
 * The system sets creation and update timestamps automatically.
 *
 * @param props - Object containing the authenticated developer, the task UUID,
 *   and the comment creation body.
 * @param props.developer - The authenticated developer making the comment.
 * @param props.taskId - The UUID of the task to associate the comment with.
 * @param props.body - The comment creation data, including task_id,
 *   commenter_id, and comment_body.
 * @returns The created task comment with full details and timestamps.
 * @throws {Error} When the taskId path parameter does not match the
 *   body.task_id.
 * @throws {Error} When the comment_body is empty.
 */
export async function posttaskManagementDeveloperTasksTaskIdComments(props: {
  developer: DeveloperPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskComment.ICreate;
}): Promise<ITaskManagementTaskComment> {
  const { developer, taskId, body } = props;

  if (taskId !== body.task_id) {
    throw new Error("Task ID in path and body do not match");
  }

  if (body.comment_body.length === 0) {
    throw new Error("Comment body must not be empty");
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.task_management_task_comments.create({
    data: {
      id,
      task_id: body.task_id,
      commenter_id: body.commenter_id,
      comment_body: body.comment_body,
      created_at: now,
      updated_at: now,
      deleted_at: null,
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
