import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Create a new comment for a task by a PMO user.
 *
 * This operation creates a task comment record linked to the specified taskId
 * and commenter, including the comment content. The timestamps for creation and
 * update are automatically set.
 *
 * Only authenticated PMO users are authorized to perform this operation.
 *
 * @param props - Object containing PMO user payload, taskId path parameter, and
 *   the comment creation body
 * @param props.pmo - The authenticated PMO user making the comment
 * @param props.taskId - UUID of the target task for the comment
 * @param props.body - The request body containing commenter ID and comment
 *   content
 * @returns The newly created task comment with all fields including metadata
 * @throws {Error} Throws on database errors such as foreign key constraints or
 *   connection issues
 */
export async function posttaskManagementPmoTasksTaskIdComments(props: {
  pmo: PmoPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskComment.ICreate;
}): Promise<ITaskManagementTaskComment> {
  const { pmo, taskId, body } = props;

  // Current timestamp for created_at and updated_at
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Create new comment record in database
  const created = await MyGlobal.prisma.task_management_task_comments.create({
    data: {
      id: v4(),
      task_id: taskId,
      commenter_id: body.commenter_id,
      comment_body: body.comment_body,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Return fully typed task comment including timestamps
  return {
    id: created.id,
    task_id: created.task_id,
    commenter_id: created.commenter_id,
    comment_body: created.comment_body,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? null,
  };
}
