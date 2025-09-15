import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalTaskActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskActivity";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Retrieve detailed information of a specific task activity by taskActivityId
 * under the task identified by taskId.
 *
 * This function fetches the task activity ensuring it belongs to the specified
 * task and has not been soft deleted. All date-time fields are converted to ISO
 * 8601 string format with proper branding. Authorization is assumed to be
 * handled before this function is called.
 *
 * @param props - Object containing the manager payload, taskId, and
 *   taskActivityId
 * @param props.manager - The authenticated manager performing the request
 * @param props.taskId - UUID of the parent task
 * @param props.taskActivityId - UUID of the specific task activity
 * @returns The detailed task activity matching the provided IDs
 * @throws {Error} Throws if no matching task activity is found
 */
export async function getjobPerformanceEvalManagerTasksTaskIdTaskActivitiesTaskActivityId(props: {
  manager: ManagerPayload;
  taskId: string & tags.Format<"uuid">;
  taskActivityId: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalTaskActivity> {
  const { manager, taskId, taskActivityId } = props;

  const record =
    await MyGlobal.prisma.job_performance_eval_task_activities.findFirstOrThrow(
      {
        where: {
          id: taskActivityId,
          task_id: taskId,
          deleted_at: null,
        },
      },
    );

  return {
    id: record.id,
    task_id: record.task_id,
    code: record.code,
    name: record.name,
    description: record.description ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
