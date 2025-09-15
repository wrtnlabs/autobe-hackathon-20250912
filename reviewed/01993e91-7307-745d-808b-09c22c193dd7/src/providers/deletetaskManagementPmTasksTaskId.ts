import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Deletes a task permanently from the task_management_tasks table by taskId.
 *
 * This operation performs a hard delete, removing the task record entirely. It
 * first verifies that the task exists and is not soft deleted.
 *
 * @param props - Object containing the authenticated PM user and the task ID to
 *   delete.
 * @param props.pm - The authenticated Project Manager performing the deletion.
 * @param props.taskId - UUID of the task to delete.
 * @throws {Error} When the task is not found or already deleted.
 */
export async function deletetaskManagementPmTasksTaskId(props: {
  pm: PmPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { pm, taskId } = props;

  const task = await MyGlobal.prisma.task_management_tasks.findFirst({
    where: {
      id: taskId,
      deleted_at: null,
    },
  });

  if (!task) {
    throw new Error("Task not found or already deleted");
  }

  await MyGlobal.prisma.task_management_tasks.delete({
    where: { id: taskId },
  });
}
