import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Creates a new task status change record for a given task.
 *
 * Logs a status transition in the task's lifecycle for auditing and tracking.
 *
 * Authorization required: user must be a PMO.
 *
 * @param props - Object containing the PMO payload, task ID, and status change
 *   data
 * @param props.pmo - Authenticated PMO payload with user ID and role
 * @param props.taskId - UUID of the task to which the status change applies
 * @param props.body - Task status change creation data, including new status
 *   ID, timestamp, and optional comment
 * @returns The created task status change record with all fields populated
 * @throws {Error} If the specified task or new status ID does not exist
 */
export async function posttaskManagementPmoTasksTaskIdStatusChanges(props: {
  pmo: PmoPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskStatusChange.ICreate;
}): Promise<ITaskManagementTaskStatusChange> {
  const { pmo, taskId, body } = props;

  // Verify the task exists
  const task = await MyGlobal.prisma.task_management_tasks.findUnique({
    where: { id: taskId },
  });
  if (!task) throw new Error("Task not found");

  // Verify the new status exists
  const status = await MyGlobal.prisma.task_management_task_statuses.findUnique(
    {
      where: { id: body.new_status_id },
    },
  );
  if (!status) throw new Error("New status not found");

  // Generate new id for status change
  const id = v4() as string & tags.Format<"uuid">;

  // Create new task status change record
  const created =
    await MyGlobal.prisma.task_management_task_status_changes.create({
      data: {
        id,
        task_id: taskId,
        new_status_id: body.new_status_id,
        changed_at: body.changed_at,
        comment: body.comment ?? null,
      },
    });

  // Return with date conversion
  return {
    id: created.id,
    task_id: created.task_id,
    new_status_id: created.new_status_id,
    changed_at: toISOStringSafe(created.changed_at),
    comment: created.comment ?? null,
  };
}
