import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTask";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Create a new task within a specified task group in the Job Performance
 * Evaluation system.
 *
 * This operation allows authenticated employees to create a task under a given
 * task group. It accepts the task details including code, name, description,
 * and optional knowledge area. It generates a UUID for the new task and sets
 * timestamps for creation and update.
 *
 * @param props - Object containing the authenticated employee, task group ID,
 *   and task creation data.
 * @param props.employee - Authenticated employee creating the task.
 * @param props.taskGroupId - UUID of the task group under which the task is
 *   created.
 * @param props.body - Task creation data including code, name, optional
 *   description, and optional knowledge area ID.
 * @returns The newly created task entity including all fields and timestamps.
 * @throws {Error} Throws if database operation fails.
 */
export async function postjobPerformanceEvalEmployeeTaskGroupsTaskGroupIdTasks(props: {
  employee: EmployeePayload;
  taskGroupId: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalTask.ICreate;
}): Promise<IJobPerformanceEvalTask> {
  const { employee, taskGroupId, body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.job_performance_eval_tasks.create({
    data: {
      id,
      task_group_id: taskGroupId,
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      knowledge_area_id: body.knowledge_area_id ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    task_group_id: created.task_group_id,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    knowledge_area_id: created.knowledge_area_id ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: null,
  };
}
