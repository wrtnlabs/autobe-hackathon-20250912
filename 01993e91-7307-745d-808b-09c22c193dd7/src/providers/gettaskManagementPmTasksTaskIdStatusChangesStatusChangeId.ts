import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Retrieve details of a specific task status change
 *
 * Retrieves detailed information for a specific status change associated with a
 * task. Authorized PM users can audit status progression including timestamps
 * and optional comments.
 *
 * @param props - The properties including the authorized PM payload and
 *   identifiers.
 * @param props.pm - The authenticated PM user payload.
 * @param props.taskId - The UUID of the target task.
 * @param props.statusChangeId - The UUID of the specific status change record.
 * @returns The detailed task status change record.
 * @throws {Error} Throws if the specified status change record is not found.
 */
export async function gettaskManagementPmTasksTaskIdStatusChangesStatusChangeId(props: {
  pm: PmPayload;
  taskId: string & tags.Format<"uuid">;
  statusChangeId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskStatusChange> {
  const { pm, taskId, statusChangeId } = props;

  const record =
    await MyGlobal.prisma.task_management_task_status_changes.findFirstOrThrow({
      where: {
        id: statusChangeId,
        task_id: taskId,
      },
    });

  return {
    id: record.id,
    task_id: record.task_id,
    new_status_id: record.new_status_id,
    changed_at: toISOStringSafe(record.changed_at),
    comment: record.comment ?? undefined,
  };
}
