import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Updates a task status change record specified by taskId and statusChangeId.
 *
 * This function verifies the existence of the record, authorization (via qa
 * param), and validates the new_status_id if provided in the update body. Only
 * fields specified in the update body will be modified.
 *
 * @param props - Object containing QA user payload, task ID, status change ID,
 *   and update body
 * @returns Updated task status change record of type
 *   ITaskManagementTaskStatusChange
 * @throws {Error} If record not found, task ID mismatch, or invalid status ID
 */
export async function puttaskManagementQaTasksTaskIdStatusChangesStatusChangeId(props: {
  qa: QaPayload;
  taskId: string & tags.Format<"uuid">;
  statusChangeId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskStatusChange.IUpdate;
}): Promise<ITaskManagementTaskStatusChange> {
  const { qa, taskId, statusChangeId, body } = props;

  // Fetch existing task status change record
  const existing =
    await MyGlobal.prisma.task_management_task_status_changes.findUnique({
      where: { id: statusChangeId },
    });
  if (!existing) throw new Error("Task status change record not found");

  // Verify the task_id matches
  if (existing.task_id !== taskId) {
    throw new Error("Task ID mismatch");
  }

  // Validate new_status_id if provided
  if (body.new_status_id !== undefined) {
    const status =
      await MyGlobal.prisma.task_management_task_statuses.findUnique({
        where: { id: body.new_status_id },
      });
    if (!status) {
      throw new Error("Invalid status id");
    }
  }

  // Build update data
  const updateData: ITaskManagementTaskStatusChange.IUpdate = {};
  if (body.new_status_id !== undefined)
    updateData.new_status_id = body.new_status_id;
  if (body.changed_at !== undefined) updateData.changed_at = body.changed_at;
  if (body.comment !== undefined)
    updateData.comment = body.comment === null ? null : body.comment;

  // Perform update
  const updated =
    await MyGlobal.prisma.task_management_task_status_changes.update({
      where: { id: statusChangeId },
      data: updateData,
    });

  // Return updated record with ISO string for datetime
  return {
    id: updated.id as string & tags.Format<"uuid">,
    task_id: updated.task_id as string & tags.Format<"uuid">,
    new_status_id: updated.new_status_id as string & tags.Format<"uuid">,
    changed_at: toISOStringSafe(updated.changed_at),
    comment: updated.comment === null ? null : updated.comment,
  };
}
