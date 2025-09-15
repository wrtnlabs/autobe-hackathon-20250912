import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalTaskActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskActivity";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Update an existing task activity's details within a specific task.
 *
 * This function verifies that the task activity exists and belongs to the
 * specified task. It then updates the task activity with the provided fields.
 *
 * @param props - Object containing employee payload, task and task activity
 *   IDs, and update body.
 * @param props.employee - The authenticated employee making the request.
 * @param props.taskId - UUID of the parent task.
 * @param props.taskActivityId - UUID of the task activity to update.
 * @param props.body - Updated task activity data.
 * @returns The updated task activity entity.
 * @throws {Error} If the task activity does not exist or does not belong to the
 *   task.
 */
export async function putjobPerformanceEvalEmployeeTasksTaskIdTaskActivitiesTaskActivityId(props: {
  employee: EmployeePayload;
  taskId: string & tags.Format<"uuid">;
  taskActivityId: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalTaskActivity.IUpdate;
}): Promise<IJobPerformanceEvalTaskActivity> {
  const { employee, taskId, taskActivityId, body } = props;

  // Verify existence and verify taskId matches
  const taskActivity =
    await MyGlobal.prisma.job_performance_eval_task_activities.findUnique({
      where: { id: taskActivityId },
    });
  if (!taskActivity) {
    throw new Error("Task activity not found");
  }
  if (taskActivity.task_id !== taskId) {
    throw new Error("Task activity does not belong to the specified task");
  }

  // Update the task activity
  const updated =
    await MyGlobal.prisma.job_performance_eval_task_activities.update({
      where: { id: taskActivityId },
      data: {
        task_id:
          body.task_id === undefined
            ? undefined
            : body.task_id === null
              ? null
              : body.task_id,
        code:
          body.code === undefined
            ? undefined
            : body.code === null
              ? null
              : body.code,
        name:
          body.name === undefined
            ? undefined
            : body.name === null
              ? null
              : body.name,
        description:
          body.description === undefined
            ? undefined
            : body.description === null
              ? null
              : body.description,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Return updated details with proper date conversions
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
