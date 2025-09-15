import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTask";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Update an existing task within a task group.
 *
 * This endpoint updates the task identified by `taskId` under the specified
 * `taskGroupId` with provided update fields. Only authenticated employees can
 * perform this update. Validations include matching the task group and proper
 * handling of optional and nullable fields.
 *
 * @param props - Object containing employee payload, taskGroupId, taskId, and
 *   update body
 * @param props.employee - Authenticated employee making the request
 * @param props.taskGroupId - UUID of the task group containing the target task
 * @param props.taskId - UUID of the task to update
 * @param props.body - Fields to update on the task
 * @returns The updated task entity with all fields including timestamps
 * @throws {Error} When the task does not belong to the specified task group
 */
export async function putjobPerformanceEvalEmployeeTaskGroupsTaskGroupIdTasksTaskId(props: {
  employee: EmployeePayload;
  taskGroupId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalTask.IUpdate;
}): Promise<IJobPerformanceEvalTask> {
  const { employee, taskGroupId, taskId, body } = props;

  const existingTask =
    await MyGlobal.prisma.job_performance_eval_tasks.findUniqueOrThrow({
      where: { id: taskId },
    });

  if (existingTask.task_group_id !== taskGroupId) {
    throw new Error("Task does not belong to the specified task group");
  }

  const updated = await MyGlobal.prisma.job_performance_eval_tasks.update({
    where: { id: taskId },
    data: {
      code: body.code ?? undefined,
      name: body.name ?? undefined,
      description:
        body.description === null ? null : (body.description ?? undefined),
      knowledge_area_id:
        body.knowledge_area_id === null
          ? null
          : (body.knowledge_area_id ?? undefined),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    task_group_id: updated.task_group_id,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? null,
    knowledge_area_id: updated.knowledge_area_id ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
