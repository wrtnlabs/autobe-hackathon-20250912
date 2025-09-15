import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTask";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Retrieve a task by its ID within a task group.
 *
 * This operation retrieves detailed information of a single Task entity within
 * the Job Performance Evaluation system, identified by both the taskGroupId and
 * taskId path parameters. It fetches all relevant task fields including codes,
 * names, optional description, knowledge area linkage, and timestamps in ISO
 * 8601 format.
 *
 * Authorization is enforced by requiring a valid manager payload.
 *
 * @param props - Object containing the manager authentication and path
 *   parameters.
 * @param props.manager - Authenticated manager payload with role and ID.
 * @param props.taskGroupId - UUID of the task group containing the task.
 * @param props.taskId - UUID of the task to retrieve.
 * @returns The detailed task information matching the specified IDs.
 * @throws {Error} Throws if no matching task is found.
 */
export async function getjobPerformanceEvalManagerTaskGroupsTaskGroupIdTasksTaskId(props: {
  manager: ManagerPayload;
  taskGroupId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalTask> {
  const { manager, taskGroupId, taskId } = props;

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
    deleted_at: task.deleted_at ?? null,
  };
}
