import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Create a new task status change record for a given task.
 *
 * This operation logs a status transition in the task's lifecycle. Only
 * authorized designers can perform this operation.
 *
 * @param props - Object containing the designer's auth info, target task ID,
 *   and new status change data
 * @param props.designer - Authenticated designer payload
 * @param props.taskId - UUID of the task to update
 * @param props.body - Payload for creating a task status change
 * @returns The newly created task status change record
 * @throws {Error} Throws if the task does not exist or on database errors
 */
export async function posttaskManagementDesignerTasksTaskIdStatusChanges(props: {
  designer: DesignerPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskStatusChange.ICreate;
}): Promise<ITaskManagementTaskStatusChange> {
  const { designer, taskId, body } = props;

  // Verify that the task exists
  await MyGlobal.prisma.task_management_tasks.findUniqueOrThrow({
    where: { id: taskId },
  });

  // Create a new task status change entry
  const created =
    await MyGlobal.prisma.task_management_task_status_changes.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        task_id: taskId,
        new_status_id: body.new_status_id,
        changed_at: body.changed_at,
        comment: body.comment ?? null,
      },
    });

  // Return the created status change record with proper ISO string for changed_at
  return {
    id: created.id as string & tags.Format<"uuid">,
    task_id: created.task_id as string & tags.Format<"uuid">,
    new_status_id: created.new_status_id as string & tags.Format<"uuid">,
    changed_at: toISOStringSafe(created.changed_at),
    comment: created.comment ?? null,
  };
}
