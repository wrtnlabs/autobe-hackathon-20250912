import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatusChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatusChange";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Retrieve details of a specific task status change
 *
 * Retrieves detailed information for a status change associated with a given
 * task. Requires the task ID and status change ID to fetch the exact record.
 * Accessible only by authorized QA users.
 *
 * @param props - Object containing the QA user payload and identifiers
 * @param props.qa - The authenticated QA user performing the request
 * @param props.taskId - The UUID of the target task
 * @param props.statusChangeId - The UUID of the target status change record
 * @returns The detailed status change record conforming to
 *   ITaskManagementTaskStatusChange
 * @throws {Error} Throws if the status change record is not found
 */
export async function gettaskManagementQaTasksTaskIdStatusChangesStatusChangeId(props: {
  qa: QaPayload;
  taskId: string & tags.Format<"uuid">;
  statusChangeId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskStatusChange> {
  const { qa, taskId, statusChangeId } = props;

  const record =
    await MyGlobal.prisma.task_management_task_status_changes.findFirstOrThrow({
      where: {
        task_id: taskId,
        id: statusChangeId,
      },
    });

  return {
    id: record.id,
    task_id: record.task_id,
    new_status_id: record.new_status_id,
    changed_at: toISOStringSafe(record.changed_at),
    comment: record.comment ?? null,
  };
}
