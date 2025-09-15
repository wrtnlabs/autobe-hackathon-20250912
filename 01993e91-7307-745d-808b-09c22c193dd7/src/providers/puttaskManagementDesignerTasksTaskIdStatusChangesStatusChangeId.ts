import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Update task status change record specified by taskId and statusChangeId.
 *
 * Allows authorized designers to update the new status, change timestamp, and
 * optional comment. Validates that the new_status_id exists and ensures task
 * association matches.
 *
 * @param props - Object containing authentication, path parameters, and update
 *   payload
 * @param props.designer - Authenticated designer making the request
 * @param props.taskId - Unique identifier of the task
 * @param props.statusChangeId - Unique identifier of the task status change
 *   record
 * @param props.body - Payload for updating the task status change record
 * @returns The updated task status change record
 * @throws {Error} When the status change record is not found or does not belong
 *   to the given task
 * @throws {Error} When the new_status_id is provided but does not exist
 */
export async function puttaskManagementDesignerTasksTaskIdStatusChangesStatusChangeId(props: {
  designer: DesignerPayload;
  taskId: string & tags.Format<"uuid">;
  statusChangeId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskStatusChange.IUpdate;
}): Promise<ITaskManagementTaskStatusChange> {
  const { designer, taskId, statusChangeId, body } = props;

  // Find the existing task status change record or throw if it doesn't exist
  const statusChange =
    await MyGlobal.prisma.task_management_task_status_changes.findUniqueOrThrow(
      {
        where: { id: statusChangeId },
      },
    );

  // Verify that the status change belongs to the specified task
  if (statusChange.task_id !== taskId) {
    throw new Error("Task ID does not match status change record");
  }

  // If new_status_id is provided, validate that it exists
  if (body.new_status_id !== undefined) {
    const statusExists =
      await MyGlobal.prisma.task_management_task_statuses.findUnique({
        where: { id: body.new_status_id },
      });
    if (!statusExists) {
      throw new Error("Invalid new_status_id: Status does not exist");
    }
  }

  // Prepare the update data object, handling optional fields
  const data: ITaskManagementTaskStatusChange.IUpdate = {
    new_status_id: body.new_status_id ?? undefined,
    changed_at: body.changed_at ?? undefined,
    comment:
      body.comment === undefined
        ? undefined
        : body.comment === null
          ? null
          : body.comment,
  };

  // Update the task status change record
  const updated =
    await MyGlobal.prisma.task_management_task_status_changes.update({
      where: { id: statusChangeId },
      data,
    });

  // Return the updated record with date-time fields converted to ISO strings
  return {
    id: updated.id,
    task_id: updated.task_id,
    new_status_id: updated.new_status_id,
    changed_at: toISOStringSafe(updated.changed_at),
    comment: updated.comment ?? null,
  };
}
