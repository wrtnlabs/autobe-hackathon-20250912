import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskAssignmentArray } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignmentArray";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Retrieve the list of assignments for a specific task.
 *
 * This operation fetches all task assignment records linked to the given
 * taskId. It requires authentication of a developer user.
 *
 * @param props - Object containing developer authentication and task ID.
 * @param props.developer - Authenticated developer user making the request.
 * @param props.taskId - UUID of the task whose assignments are to be listed.
 * @returns A promise resolving to an array of task assignments.
 * @throws {Error} Throws if the specified task does not exist.
 */
export async function patchtaskManagementDeveloperTasksTaskIdAssignments(props: {
  developer: DeveloperPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskAssignmentArray> {
  const { developer, taskId } = props;

  // Verify task exists, throw if not
  await MyGlobal.prisma.task_management_tasks.findUniqueOrThrow({
    where: { id: taskId },
  });

  // Retrieve all assignments for the given task
  const assignments =
    await MyGlobal.prisma.task_management_task_assignments.findMany({
      where: { task_id: taskId },
      select: {
        id: true,
        task_id: true,
        assignee_id: true,
        assigned_at: true,
      },
    });

  // Map assignment data to API structure, convert dates
  return {
    data: assignments.map((a) => ({
      id: a.id,
      task_id: a.task_id,
      assignee_id: a.assignee_id,
      assigned_at: toISOStringSafe(a.assigned_at),
    })),
  };
}
