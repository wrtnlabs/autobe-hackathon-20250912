import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Retrieve details of a specific task status change
 *
 * This function fetches a single task status change record identified by both
 * the taskId and statusChangeId, ensuring the record belongs to the given task.
 * It performs authorization check implicitly by presence of the PMO payload.
 *
 * @param props - Object containing PMO authentication and identifiers
 * @param props.pmo - Authenticated PMO user payload
 * @param props.taskId - UUID of the task to which the status change belongs
 * @param props.statusChangeId - UUID of the status change record
 * @returns The detailed task status change record
 * @throws {Error} If the specified status change does not exist or does not
 *   belong to the task
 */
export async function gettaskManagementPmoTasksTaskIdStatusChangesStatusChangeId(props: {
  pmo: PmoPayload;
  taskId: string & tags.Format<"uuid">;
  statusChangeId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskStatusChange> {
  const { pmo, taskId, statusChangeId } = props;

  const record =
    await MyGlobal.prisma.task_management_task_status_changes.findUniqueOrThrow(
      {
        where: {
          id: statusChangeId,
          task_id: taskId,
        },
      },
    );

  return {
    id: record.id,
    task_id: record.task_id,
    new_status_id: record.new_status_id,
    changed_at: toISOStringSafe(record.changed_at),
    comment: record.comment ?? null,
  };
}
