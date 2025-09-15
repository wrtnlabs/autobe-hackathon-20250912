import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Create a new task status change record
 *
 * This operation creates a record logging the change of status for a specific
 * task. Only authorized PM users can create status changes. The input must
 * provide a valid new status ID and a timestamp when the change occurred. An
 * optional comment explaining the change can also be included.
 *
 * @param props - Object containing the PM user payload, task ID, and the status
 *   change data
 * @param props.pm - Authenticated Project Manager payload
 * @param props.taskId - UUID of the task being changed
 * @param props.body - Status change data including new status and changed
 *   timestamp
 * @returns The created task status change record with all fields
 * @throws {Error} Throws if the creation failed or any database error occurs
 */
export async function posttaskManagementPmTasksTaskIdStatusChanges(props: {
  pm: PmPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskStatusChange.ICreate;
}): Promise<ITaskManagementTaskStatusChange> {
  const { pm, taskId, body } = props;

  // Authorization is validated by the pm payload from decorator

  const created =
    await MyGlobal.prisma.task_management_task_status_changes.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        task_id: taskId,
        new_status_id: body.new_status_id,
        changed_at: body.changed_at,
        comment: body.comment ?? undefined,
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
