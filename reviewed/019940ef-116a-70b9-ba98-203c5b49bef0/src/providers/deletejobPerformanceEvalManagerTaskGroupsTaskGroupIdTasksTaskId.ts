import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Permanently delete a task from a specific task group in the Job Performance
 * Evaluation system.
 *
 * This operation removes the task record entirely from the database. Only
 * authenticated managers can perform this irreversible action.
 *
 * @param props - The input properties containing the authenticated manager and
 *   IDs.
 * @param props.manager - Authenticated manager performing the deletion.
 * @param props.taskGroupId - UUID of the task group containing the task.
 * @param props.taskId - UUID of the task to be deleted.
 * @throws {Error} Throws if the task does not exist within the specified task
 *   group.
 */
export async function deletejobPerformanceEvalManagerTaskGroupsTaskGroupIdTasksTaskId(props: {
  manager: ManagerPayload;
  taskGroupId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { manager, taskGroupId, taskId } = props;

  // Verify the task exists and matches the given taskGroupId
  const task =
    await MyGlobal.prisma.job_performance_eval_tasks.findFirstOrThrow({
      where: {
        id: taskId,
        task_group_id: taskGroupId,
      },
      select: {
        id: true,
        task_group_id: true,
      },
    });

  // Hard delete the task permanently
  await MyGlobal.prisma.job_performance_eval_tasks.delete({
    where: {
      id: task.id,
    },
  });
}
