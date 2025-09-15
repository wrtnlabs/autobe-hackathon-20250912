import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Creates a new task status change record linked to a specific task. This
 * operation logs the transition of a task's status, ensuring the referenced
 * task and new status exist and associating an optional comment.
 *
 * Authorization: Only developers are allowed to create status changes.
 *
 * @param props - Object containing developer authentication, target task ID,
 *   and status change details
 * @param props.developer - Authenticated developer user performing the
 *   operation
 * @param props.taskId - UUID of the task whose status is changing
 * @param props.body - Status change details including new status ID, change
 *   timestamp, and optional comment
 * @returns Promise resolving to the newly created task status change record
 * @throws {Error} If the specified task does not exist
 * @throws {Error} If the specified new status does not exist
 */
export async function posttaskManagementDeveloperTasksTaskIdStatusChanges(props: {
  developer: DeveloperPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskStatusChange.ICreate;
}): Promise<ITaskManagementTaskStatusChange> {
  const { developer, taskId, body } = props;

  const task = await MyGlobal.prisma.task_management_tasks.findUnique({
    where: { id: taskId },
  });
  if (!task) {
    throw new Error("Task not found");
  }

  const status = await MyGlobal.prisma.task_management_task_statuses.findUnique(
    {
      where: { id: body.new_status_id },
    },
  );
  if (!status) {
    throw new Error("New status not found");
  }

  const newId = v4() as string & tags.Format<"uuid">;

  const created =
    await MyGlobal.prisma.task_management_task_status_changes.create({
      data: {
        id: newId,
        task_id: taskId,
        new_status_id: body.new_status_id,
        changed_at: toISOStringSafe(body.changed_at),
        comment: body.comment ?? null,
      },
    });

  return {
    id: created.id,
    task_id: created.task_id,
    new_status_id: created.new_status_id,
    changed_at: toISOStringSafe(created.changed_at),
    comment: created.comment ?? null,
  };
}
