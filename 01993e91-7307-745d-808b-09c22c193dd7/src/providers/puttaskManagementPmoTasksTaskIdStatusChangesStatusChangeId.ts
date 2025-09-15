import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Update task status change record
 *
 * Updates an existing task status change record identified by taskId and
 * statusChangeId. Allows updating new status, change timestamp, and optional
 * comment. Ensures record existence and returns the updated status change
 * record.
 *
 * @param props - Object containing pmo authentication payload, taskId,
 *   statusChangeId, and update body.
 * @param props.pmo - Authenticated PMO user payload.
 * @param props.taskId - UUID of the target task.
 * @param props.statusChangeId - UUID of the task status change record.
 * @param props.body - Update payload with new_status_id, changed_at, and
 *   comment.
 * @returns The updated ITaskManagementTaskStatusChange object.
 * @throws {Error} When the specified status change record does not exist.
 */
export async function puttaskManagementPmoTasksTaskIdStatusChangesStatusChangeId(props: {
  pmo: PmoPayload;
  taskId: string & tags.Format<"uuid">;
  statusChangeId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskStatusChange.IUpdate;
}): Promise<ITaskManagementTaskStatusChange> {
  const { pmo, taskId, statusChangeId, body } = props;

  const existing =
    await MyGlobal.prisma.task_management_task_status_changes.findFirstOrThrow({
      where: {
        id: statusChangeId,
        task_id: taskId,
      },
    });

  const updated =
    await MyGlobal.prisma.task_management_task_status_changes.update({
      where: { id: statusChangeId },
      data: {
        new_status_id: body.new_status_id ?? undefined,
        changed_at: body.changed_at ?? undefined,
        comment: body.comment ?? undefined,
      },
    });

  return {
    id: updated.id,
    task_id: updated.task_id,
    new_status_id: updated.new_status_id,
    changed_at: toISOStringSafe(updated.changed_at),
    comment: updated.comment ?? null,
  };
}
