import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Updates an existing task status change record specified by taskId and
 * statusChangeId.
 *
 * Allows authorized developer users to update the status transition fields and
 * comments. Ensures ownership of the task by the authenticated developer.
 * Validates the existence of new_status_id if provided.
 *
 * @param props - Object containing the authenticated developer, taskId,
 *   statusChangeId, and update body
 * @returns The updated task status change record
 * @throws {Error} When the status change record is not found
 * @throws {Error} When the task does not exist
 * @throws {Error} When the developer does not own the task
 * @throws {Error} When the new_status_id is invalid
 */
export async function puttaskManagementDeveloperTasksTaskIdStatusChangesStatusChangeId(props: {
  developer: DeveloperPayload;
  taskId: string & tags.Format<"uuid">;
  statusChangeId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskStatusChange.IUpdate;
}): Promise<ITaskManagementTaskStatusChange> {
  const { developer, taskId, statusChangeId, body } = props;

  const statusChange =
    await MyGlobal.prisma.task_management_task_status_changes.findFirst({
      where: {
        id: statusChangeId,
        task_id: taskId,
      },
    });
  if (!statusChange)
    throw new Error(`Status change record not found for id: ${statusChangeId}`);

  const task = await MyGlobal.prisma.task_management_tasks.findUnique({
    where: { id: taskId },
  });
  if (!task) throw new Error(`Task not found for id: ${taskId}`);

  if (task.creator_id !== developer.id)
    throw new Error("Unauthorized: Developer does not own the task");

  if (body.new_status_id !== undefined) {
    const statusExists =
      await MyGlobal.prisma.task_management_task_statuses.findUnique({
        where: { id: body.new_status_id },
      });
    if (!statusExists)
      throw new Error(`Invalid new_status_id: ${body.new_status_id}`);
  }

  const updates: ITaskManagementTaskStatusChange.IUpdate = {
    new_status_id: body.new_status_id ?? undefined,
    changed_at: body.changed_at ?? undefined,
    comment: body.comment ?? undefined,
  };

  const updated =
    await MyGlobal.prisma.task_management_task_status_changes.update({
      where: { id: statusChangeId },
      data: updates,
    });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    task_id: updated.task_id as string & tags.Format<"uuid">,
    new_status_id: updated.new_status_id as string & tags.Format<"uuid">,
    changed_at: toISOStringSafe(updated.changed_at),
    comment: updated.comment ?? null,
  };
}
