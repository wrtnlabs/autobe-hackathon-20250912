import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Delete a specific task status change record.
 *
 * This operation deletes a task status change record identified by
 * statusChangeId associated with a task identified by taskId. Only the TPM user
 * who owns the task is authorized to perform this deletion.
 *
 * @param props - Object containing TPM credentials and identifiers for task and
 *   status change
 * @param props.tpm - Authenticated TPM user payload
 * @param props.taskId - UUID of the task to which the status change belongs
 * @param props.statusChangeId - UUID of the status change record to delete
 * @throws {Error} If the status change record does not exist
 * @throws {Error} If the status change record is not associated with the
 *   specified task
 * @throws {Error} If the task does not exist
 * @throws {Error} If the TPM user is not the owner of the task
 */
export async function deletetaskManagementTpmTasksTaskIdStatusChangesStatusChangeId(props: {
  tpm: TpmPayload;
  taskId: string & tags.Format<"uuid">;
  statusChangeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { tpm, taskId, statusChangeId } = props;

  const statusChange =
    await MyGlobal.prisma.task_management_task_status_changes.findUnique({
      where: { id: statusChangeId },
    });

  if (!statusChange) {
    throw new Error(`Status change with ID ${statusChangeId} not found`);
  }

  if (statusChange.task_id !== taskId) {
    throw new Error(
      `Status change ${statusChangeId} does not belong to task ${taskId}`,
    );
  }

  const task = await MyGlobal.prisma.task_management_tasks.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new Error(`Task with ID ${taskId} not found`);
  }

  if (task.creator_id !== tpm.id) {
    throw new Error(`Unauthorized: TPM user does not own the task`);
  }

  await MyGlobal.prisma.task_management_task_status_changes.delete({
    where: { id: statusChangeId },
  });
}
