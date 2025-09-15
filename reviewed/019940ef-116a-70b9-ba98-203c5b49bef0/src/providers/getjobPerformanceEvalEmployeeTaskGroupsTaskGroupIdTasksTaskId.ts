import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTask";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Retrieve detailed information about a specific task within a task group in
 * the Job Performance Evaluation system.
 *
 * This operation fetches the task identified by both taskGroupId and taskId
 * ensuring it has not been soft-deleted. Only authenticated employees can
 * perform this operation.
 *
 * @param props - Object containing employee auth payload, taskGroupId, and
 *   taskId parameters
 * @param props.employee - Authenticated employee information
 * @param props.taskGroupId - UUID of the task group containing the task
 * @param props.taskId - UUID of the task to retrieve
 * @returns The detailed task information conforming to IJobPerformanceEvalTask
 * @throws {Error} If the task does not exist or has been deleted
 */
export async function getjobPerformanceEvalEmployeeTaskGroupsTaskGroupIdTasksTaskId(props: {
  employee: EmployeePayload;
  taskGroupId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalTask> {
  const { employee, taskGroupId, taskId } = props;

  const task =
    await MyGlobal.prisma.job_performance_eval_tasks.findFirstOrThrow({
      where: {
        id: taskId,
        task_group_id: taskGroupId,
        deleted_at: null,
      },
    });

  return {
    id: task.id,
    task_group_id: task.task_group_id,
    code: task.code,
    name: task.name,
    description: task.description ?? null,
    knowledge_area_id: task.knowledge_area_id ?? null,
    created_at: toISOStringSafe(task.created_at),
    updated_at: toISOStringSafe(task.updated_at),
    deleted_at: task.deleted_at ? toISOStringSafe(task.deleted_at) : null,
  };
}
