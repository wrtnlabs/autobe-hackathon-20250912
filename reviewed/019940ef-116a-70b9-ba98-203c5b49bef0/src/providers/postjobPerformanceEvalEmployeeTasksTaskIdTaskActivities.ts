import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalTaskActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskActivity";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Create a new task activity under a specific task.
 *
 * This operation creates a new task activity entity linked with the provided
 * taskId. It requires an authenticated employee and follows the
 * IJobPerformanceEvalTaskActivity.ICreate schema for the request body.
 *
 * @param props - The parameter object containing:
 *
 *   - Employee: The authenticated employee payload initiating the creation
 *   - TaskId: The UUID of the parent task
 *   - Body: The task activity creation data
 *
 * @returns The newly created IJobPerformanceEvalTaskActivity entity with all
 *   fields populated.
 * @throws {Error} Throws if the creation fails or any database error occurs.
 */
export async function postjobPerformanceEvalEmployeeTasksTaskIdTaskActivities(props: {
  employee: EmployeePayload;
  taskId: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalTaskActivity.ICreate;
}): Promise<IJobPerformanceEvalTaskActivity> {
  const { employee, taskId, body } = props;

  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.job_performance_eval_task_activities.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        task_id: taskId,
        code: body.code,
        name: body.name,
        description: body.description ?? null,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    task_id: created.task_id,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
