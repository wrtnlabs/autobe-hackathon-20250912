import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalTaskActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskActivity";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Retrieve detailed information of a specific task activity.
 *
 * This function fetches the task activity record identified by the given
 * taskActivityId under the specified taskId for the authenticated employee. It
 * returns code, name, optional description, and timestamp fields with proper
 * date-time formatting.
 *
 * @param props - Object containing employee payload, taskId, and
 *   taskActivityId.
 * @param props.employee - The authenticated employee making the request.
 * @param props.taskId - UUID of the parent task.
 * @param props.taskActivityId - UUID of the specific task activity.
 * @returns Detailed task activity information.
 * @throws {Error} Throws if task activity is not found or parameters are
 *   invalid.
 */
export async function getjobPerformanceEvalEmployeeTasksTaskIdTaskActivitiesTaskActivityId(props: {
  employee: EmployeePayload;
  taskId: string & tags.Format<"uuid">;
  taskActivityId: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalTaskActivity> {
  const { employee, taskId, taskActivityId } = props;

  const result =
    await MyGlobal.prisma.job_performance_eval_task_activities.findFirstOrThrow(
      {
        where: {
          id: taskActivityId,
          task_id: taskId,
        },
        select: {
          id: true,
          task_id: true,
          code: true,
          name: true,
          description: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );

  return {
    id: result.id,
    task_id: result.task_id,
    code: result.code,
    name: result.name,
    description: result.description ?? undefined,
    created_at: toISOStringSafe(result.created_at),
    updated_at: toISOStringSafe(result.updated_at),
    deleted_at: result.deleted_at ? toISOStringSafe(result.deleted_at) : null,
  };
}
