import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Deletes a specific task status change record.
 *
 * This operation permanently removes a status change record identified by
 * `statusChangeId` associated with a task identified by `taskId`. Only
 * authorized PM users may perform this operation.
 *
 * @param props - Object containing the PM user payload, task ID, and status
 *   change ID
 * @param props.pm - The authenticated PM user performing the deletion
 * @param props.taskId - UUID of the task associated with the status change
 * @param props.statusChangeId - UUID of the status change record to delete
 * @throws {Error} Throws if the status change record does not exist or does not
 *   belong to the task
 */
export async function deletetaskManagementPmTasksTaskIdStatusChangesStatusChangeId(props: {
  pm: PmPayload;
  taskId: string & tags.Format<"uuid">;
  statusChangeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { pm, taskId, statusChangeId } = props;

  // Verify the status change record exists and belongs to the given task
  await MyGlobal.prisma.task_management_task_status_changes.findFirstOrThrow({
    where: {
      id: statusChangeId,
      task_id: taskId,
    },
  });

  // Perform a hard delete
  await MyGlobal.prisma.task_management_task_status_changes.delete({
    where: { id: statusChangeId },
  });
}
