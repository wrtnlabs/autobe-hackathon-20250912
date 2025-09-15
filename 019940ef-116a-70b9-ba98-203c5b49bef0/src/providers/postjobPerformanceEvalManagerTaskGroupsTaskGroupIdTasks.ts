import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTask";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Create a new task within a specific task group in the Job Performance
 * Evaluation system.
 *
 * This endpoint is restricted to authenticated managers and accepts a JSON
 * payload containing the task's code, name, optional description, and optional
 * knowledge area ID. It sets system-generated timestamps and a UUID for the new
 * task record.
 *
 * @param props - Object containing the authenticated manager, taskGroupId path
 *   parameter, and request body
 * @param props.manager - Authenticated manager payload performing the operation
 * @param props.taskGroupId - UUID of the task group in which to create the task
 * @param props.body - Task creation data including code, name, description, and
 *   optional knowledge_area_id
 * @returns The newly created task object including system timestamps and
 *   generated UUID
 * @throws {Error} On Prisma or database operation failures
 */
export async function postjobPerformanceEvalManagerTaskGroupsTaskGroupIdTasks(props: {
  manager: ManagerPayload;
  taskGroupId: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalTask.ICreate;
}): Promise<IJobPerformanceEvalTask> {
  const { manager, taskGroupId, body } = props;

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.job_performance_eval_tasks.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      task_group_id: taskGroupId,
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      knowledge_area_id: body.knowledge_area_id ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    task_group_id: created.task_group_id as string & tags.Format<"uuid">,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    knowledge_area_id: created.knowledge_area_id ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
