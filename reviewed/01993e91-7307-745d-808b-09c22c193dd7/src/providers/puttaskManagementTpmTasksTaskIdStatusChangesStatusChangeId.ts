import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Update task status change record
 *
 * This function updates an existing task status change record identified by the
 * provided taskId and statusChangeId. It requires authorization as a TPM user.
 * Only fields provided in the update body will be changed.
 *
 * @param props - The request parameters including authorization, path
 *   parameters, and the update body.
 * @param props.tpm - Authenticated TPM user payload.
 * @param props.taskId - Unique identifier of the task.
 * @param props.statusChangeId - Unique identifier of the status change record.
 * @param props.body - The fields to update in the status change record.
 * @returns The updated task status change record with all fields properly
 *   formatted.
 * @throws {Error} If the authenticated TPM user is not found or inactive.
 * @throws {Error} If the task status change record is not found.
 * @throws {Error} If the new_status_id provided does not exist.
 */
export async function puttaskManagementTpmTasksTaskIdStatusChangesStatusChangeId(props: {
  tpm: TpmPayload;
  taskId: string & tags.Format<"uuid">;
  statusChangeId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskStatusChange.IUpdate;
}): Promise<ITaskManagementTaskStatusChange> {
  const { tpm, taskId, statusChangeId, body } = props;

  // Verify TPM user exists and is active
  const tpmUser = await MyGlobal.prisma.task_management_tpm.findFirst({
    where: { id: tpm.id, deleted_at: null },
  });
  if (!tpmUser) throw new Error("Unauthorized: TPM user not found or inactive");

  // Find existing status change record
  const statusChange =
    await MyGlobal.prisma.task_management_task_status_changes.findFirst({
      where: { id: statusChangeId, task_id: taskId },
    });
  if (!statusChange) throw new Error("Task status change not found");

  // Validate new_status_id if provided
  if (body.new_status_id !== undefined) {
    const statusExists =
      await MyGlobal.prisma.task_management_task_statuses.findFirst({
        where: { id: body.new_status_id },
      });
    if (!statusExists)
      throw new Error("Invalid new_status_id: Status not found");
  }

  // Update the record
  const updated =
    await MyGlobal.prisma.task_management_task_status_changes.update({
      where: { id: statusChangeId },
      data: {
        new_status_id: body.new_status_id ?? undefined,
        changed_at: body.changed_at ?? undefined,
        comment: body.comment === null ? null : (body.comment ?? undefined),
      },
    });

  // Return updated record with date conversions
  return {
    id: updated.id,
    task_id: updated.task_id,
    new_status_id: updated.new_status_id,
    changed_at: toISOStringSafe(updated.changed_at),
    comment: updated.comment ?? null,
  };
}
