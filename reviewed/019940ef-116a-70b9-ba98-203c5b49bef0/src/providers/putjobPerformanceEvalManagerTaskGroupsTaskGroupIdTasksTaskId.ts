import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTask";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Update the details of an existing task within a task group in the Job
 * Performance Evaluation system. Only authenticated users with 'manager' role
 * may perform this operation. The operation updates available fields such as
 * code, name, description, and knowledge area.
 *
 * @param props - Object containing manager authentication, taskGroupId, taskId,
 *   and update body
 * @param props.manager - Authenticated manager information
 * @param props.taskGroupId - UUID of the task group
 * @param props.taskId - UUID of the task to update
 * @param props.body - Partial task data to update
 * @returns Updated task record conforming to IJobPerformanceEvalTask
 * @throws {Error} When task is not found
 */
export async function putjobPerformanceEvalManagerTaskGroupsTaskGroupIdTasksTaskId(props: {
  manager: ManagerPayload;
  taskGroupId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalTask.IUpdate;
}): Promise<IJobPerformanceEvalTask> {
  const { manager, taskGroupId, taskId, body } = props;

  const existingTask =
    await MyGlobal.prisma.job_performance_eval_tasks.findFirst({
      where: {
        id: taskId,
        task_group_id: taskGroupId,
        deleted_at: null,
      },
    });

  if (!existingTask) throw new Error("Task not found");

  const updatedTask = await MyGlobal.prisma.job_performance_eval_tasks.update({
    where: { id: taskId },
    data: {
      code: body.code ?? undefined,
      name: body.name ?? undefined,
      description: body.description ?? undefined,
      knowledge_area_id: body.knowledge_area_id ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updatedTask.id,
    task_group_id: updatedTask.task_group_id,
    code: updatedTask.code,
    name: updatedTask.name,
    description: updatedTask.description ?? null,
    knowledge_area_id: updatedTask.knowledge_area_id ?? null,
    created_at: toISOStringSafe(updatedTask.created_at),
    updated_at: toISOStringSafe(updatedTask.updated_at),
    deleted_at: updatedTask.deleted_at
      ? toISOStringSafe(updatedTask.deleted_at)
      : null,
  };
}
