import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Permanently delete a task from a specific task group in the Job Performance
 * Evaluation system.
 *
 * This operation removes the task record entirely from the database. Requires
 * valid taskGroupId and taskId path parameters to identify the target task.
 * Accessible only to authenticated users with role 'employee'.
 *
 * @param props - Object containing the employee payload and identifiers.
 * @param props.employee - The authenticated employee performing the operation.
 * @param props.taskGroupId - UUID of the task group containing the task.
 * @param props.taskId - UUID of the task to delete.
 * @returns Void
 * @throws {Error} Throws if task does not exist or access is unauthorized.
 */
export async function deletejobPerformanceEvalEmployeeTaskGroupsTaskGroupIdTasksTaskId(props: {
  employee: EmployeePayload;
  taskGroupId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { employee, taskGroupId, taskId } = props;

  await MyGlobal.prisma.job_performance_eval_tasks.findFirstOrThrow({
    where: {
      id: taskId,
      task_group_id: taskGroupId,
      deleted_at: null,
    },
  });

  await MyGlobal.prisma.job_performance_eval_tasks.delete({
    where: {
      id: taskId,
    },
  });
}
