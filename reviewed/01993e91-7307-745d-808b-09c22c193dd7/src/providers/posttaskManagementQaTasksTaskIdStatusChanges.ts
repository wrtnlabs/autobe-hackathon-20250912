import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Creates a new task status change record for a given task.
 *
 * This operation logs a status transition in the task's lifecycle.
 *
 * Only authorized QA role can perform this operation.
 *
 * @param props - The function parameters including authenticated QA user,
 *   taskId and payload
 * @param props.qa - Authenticated QA user payload
 * @param props.taskId - UUID of the task whose status is changed
 * @param props.body - Payload for creating a task status change record
 * @returns The newly created task status change record
 * @throws {Error} When the specified task does not exist
 * @throws {Error} When the specified new status does not exist
 */
export async function posttaskManagementQaTasksTaskIdStatusChanges(props: {
  qa: QaPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskStatusChange.ICreate;
}): Promise<ITaskManagementTaskStatusChange> {
  const { qa, taskId, body } = props;

  // Verify task existence
  const task = await MyGlobal.prisma.task_management_tasks.findUnique({
    where: { id: taskId },
  });
  if (!task) throw new Error("Task not found");

  // Verify new status existence
  const status = await MyGlobal.prisma.task_management_task_statuses.findUnique(
    { where: { id: body.new_status_id } },
  );
  if (!status) throw new Error("Status not found");

  // Generate new UUID for this record
  const id = v4() as string & tags.Format<"uuid">;

  // Create new status change record
  const created =
    await MyGlobal.prisma.task_management_task_status_changes.create({
      data: {
        id,
        task_id: body.task_id,
        new_status_id: body.new_status_id,
        changed_at: body.changed_at,
        comment: body.comment ?? null,
      },
    });

  // Return the created record with ISO string date
  return {
    id: created.id,
    task_id: created.task_id,
    new_status_id: created.new_status_id,
    changed_at: toISOStringSafe(created.changed_at),
    comment: created.comment ?? null,
  };
}
