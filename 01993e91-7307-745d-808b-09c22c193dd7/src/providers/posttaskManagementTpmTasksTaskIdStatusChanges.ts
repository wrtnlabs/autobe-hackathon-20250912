import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Create a new task status change record for a given task.
 *
 * This records a lifecycle status change on a task, associating it with a new
 * status. Only authorized TPM users can perform this operation.
 *
 * @param props - Object containing TPM user, task ID, and status change details
 * @param props.tpm - Authenticated TPM user performing the operation
 * @param props.taskId - UUID of the task to update status for
 * @param props.body - Payload containing new status ID, change timestamp, and
 *   optional comment
 * @returns The newly created task status change record
 * @throws {Error} Throws if the TPM user is not authorized, the task does not
 *   exist, or the new status is invalid
 */
export async function posttaskManagementTpmTasksTaskIdStatusChanges(props: {
  tpm: TpmPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskStatusChange.ICreate;
}): Promise<ITaskManagementTaskStatusChange> {
  const { tpm, taskId, body } = props;

  // Authorization: Verify TPM user exists and is active (Soft delete check via deleted_at)
  await MyGlobal.prisma.task_management_tpm.findFirstOrThrow({
    where: { id: tpm.id, deleted_at: null },
  });

  // Validate the task exists
  await MyGlobal.prisma.task_management_tasks.findUniqueOrThrow({
    where: { id: taskId },
  });

  // Validate the new status exists
  await MyGlobal.prisma.task_management_task_statuses.findUniqueOrThrow({
    where: { id: body.new_status_id },
  });

  // Generate new id for the status change record
  const newId = v4() as string & tags.Format<"uuid">;

  // Insert the new task status change record
  const created =
    await MyGlobal.prisma.task_management_task_status_changes.create({
      data: {
        id: newId,
        task_id: taskId,
        new_status_id: body.new_status_id,
        changed_at: body.changed_at,
        comment: body.comment ?? undefined,
      },
    });

  // Return the newly created status change with proper date conversion
  return {
    id: created.id,
    task_id: created.task_id,
    new_status_id: created.new_status_id,
    changed_at: toISOStringSafe(created.changed_at),
    comment: created.comment ?? null,
  };
}
