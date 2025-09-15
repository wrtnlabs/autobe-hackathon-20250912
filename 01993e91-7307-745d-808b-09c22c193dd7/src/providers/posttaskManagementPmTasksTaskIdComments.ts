import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskComment";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Creates a new comment on a specific task by a Project Manager (PM).
 *
 * This function verifies the existence of the target task, then creates a new
 * task comment linked to the specified task and commenter. It automatically
 * sets creation and update timestamps.
 *
 * Authorization is implicit via the pm payload.
 *
 * @param props - Object containing pm authorization info, task ID, and comment
 *   data
 * @param props.pm - Authenticated PM user payload
 * @param props.taskId - UUID of the target task
 * @param props.body - The comment creation data (comment_body, commenter_id)
 * @returns The created task comment with all fields including timestamps
 * @throws {Error} When the referenced task does not exist
 */
export async function posttaskManagementPmTasksTaskIdComments(props: {
  pm: PmPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskComment.ICreate;
}): Promise<ITaskManagementTaskComment> {
  const { pm, taskId, body } = props;

  // Verify that the task exists
  await MyGlobal.prisma.task_management_tasks.findUniqueOrThrow({
    where: { id: taskId },
  });

  // Prepare timestamps using toISOStringSafe
  const now = toISOStringSafe(new Date());

  // Create the new comment
  const created = await MyGlobal.prisma.task_management_task_comments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      task_id: taskId,
      commenter_id: body.commenter_id,
      comment_body: body.comment_body,
      created_at: now,
      updated_at: now,
    },
  });

  // Return the created comment, converting Dates to ISO strings
  return {
    id: created.id,
    task_id: created.task_id,
    commenter_id: created.commenter_id,
    comment_body: created.comment_body,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ?? null,
  };
}
