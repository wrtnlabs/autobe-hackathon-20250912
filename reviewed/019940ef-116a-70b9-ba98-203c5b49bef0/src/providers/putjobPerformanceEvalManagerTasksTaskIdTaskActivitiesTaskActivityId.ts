import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalTaskActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskActivity";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Update an existing task activity's details
 *
 * This operation updates the specified task activity identified by
 * taskActivityId under the specified task by taskId. Only managers can perform
 * this operation.
 *
 * @param props - Object containing authenticated manager, taskId,
 *   taskActivityId, and update data
 * @returns The updated task activity entity
 * @throws {Error} When the task activity is not found or does not belong to the
 *   specified task
 */
export async function putjobPerformanceEvalManagerTasksTaskIdTaskActivitiesTaskActivityId(props: {
  manager: ManagerPayload;
  taskId: string & tags.Format<"uuid">;
  taskActivityId: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalTaskActivity.IUpdate;
}): Promise<IJobPerformanceEvalTaskActivity> {
  const { manager, taskId, taskActivityId, body } = props;

  const taskActivity =
    await MyGlobal.prisma.job_performance_eval_task_activities.findUnique({
      where: { id: taskActivityId },
    });

  if (!taskActivity) throw new Error("Task activity not found");
  if (taskActivity.task_id !== taskId)
    throw new Error("Task ID does not match task activity");

  const updated =
    await MyGlobal.prisma.job_performance_eval_task_activities.update({
      where: { id: taskActivityId },
      data: {
        task_id: body.task_id ?? undefined,
        code: body.code ?? undefined,
        name: body.name ?? undefined,
        description:
          body.description === null ? null : (body.description ?? undefined),
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    task_id: updated.task_id,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
