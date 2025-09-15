import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Delete a task by taskId from the task_management_tasks table.
 *
 * This operation performs a hard delete of the task record specified by taskId.
 * It throws if the task does not exist. Authorization is required for PMO
 * role.
 *
 * @param props - Object containing the authenticated PMO payload and the task
 *   UUID.
 * @param props.pmo - The authenticated PMO making the request.
 * @param props.taskId - The UUID of the task to be deleted.
 * @throws {Error} Throws if the task does not exist.
 */
export async function deletetaskManagementPmoTasksTaskId(props: {
  pmo: PmoPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { pmo, taskId } = props;

  // Ensure task exists or throw error
  await MyGlobal.prisma.task_management_tasks.findUniqueOrThrow({
    where: { id: taskId },
  });

  // Perform hard delete
  await MyGlobal.prisma.task_management_tasks.delete({
    where: { id: taskId },
  });
}
