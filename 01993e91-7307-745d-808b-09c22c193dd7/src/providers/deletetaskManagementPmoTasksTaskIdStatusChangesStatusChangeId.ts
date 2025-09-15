import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Deletes a specific task status change record associated with a task.
 *
 * This operation permanently removes the status change entry identified by
 * statusChangeId for the task identified by taskId from the
 * task_management_task_status_changes table. It throws an error if the record
 * does not exist.
 *
 * Authorization: Only users with PMO role can perform this operation.
 *
 * @param props - Object containing the PMO user information and the identifiers
 * @param props.pmo - The authenticated PMO user payload
 * @param props.taskId - The UUID of the task the status change belongs to
 * @param props.statusChangeId - The UUID of the status change record to delete
 * @throws {Error} When the status change record with specified IDs does not
 *   exist
 */
export async function deletetaskManagementPmoTasksTaskIdStatusChangesStatusChangeId(props: {
  pmo: PmoPayload;
  taskId: string & tags.Format<"uuid">;
  statusChangeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { pmo, taskId, statusChangeId } = props;

  const statusChange =
    await MyGlobal.prisma.task_management_task_status_changes.findFirst({
      where: {
        id: statusChangeId,
        task_id: taskId,
      },
    });

  if (!statusChange) {
    throw new Error(
      `Status change with ID ${statusChangeId} for Task ${taskId} not found.`,
    );
  }

  await MyGlobal.prisma.task_management_task_status_changes.delete({
    where: { id: statusChangeId },
  });
}
