import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Delete a specific task activity by IDs
 *
 * This operation permanently deletes a task activity record from the database
 * identified by both taskId and taskActivityId. It requires an authenticated
 * employee and will throw an error if the task activity does not exist or is
 * already deleted.
 *
 * @param props - Object containing employee payload and identifiers.
 * @param props.employee - Authenticated employee performing the operation.
 * @param props.taskId - UUID of the task.
 * @param props.taskActivityId - UUID of the task activity to delete.
 * @throws {Error} When task activity is not found or already deleted.
 */
export async function deletejobPerformanceEvalEmployeeTasksTaskIdTaskActivitiesTaskActivityId(props: {
  employee: EmployeePayload;
  taskId: string & tags.Format<"uuid">;
  taskActivityId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { employee, taskId, taskActivityId } = props;

  // Find the task activity ensuring it belongs to the specified task and is not soft deleted
  const taskActivity =
    await MyGlobal.prisma.job_performance_eval_task_activities.findFirst({
      where: {
        id: taskActivityId,
        task_id: taskId,
        deleted_at: null,
      },
      select: {
        id: true,
        task_id: true,
      },
    });

  if (!taskActivity) {
    throw new Error("Task activity not found or already deleted");
  }

  // Perform hard delete
  await MyGlobal.prisma.job_performance_eval_task_activities.delete({
    where: {
      id: taskActivityId,
    },
  });
}
