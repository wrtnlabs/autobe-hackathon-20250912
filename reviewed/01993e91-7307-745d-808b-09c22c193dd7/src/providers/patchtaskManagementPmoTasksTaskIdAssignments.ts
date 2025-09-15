import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskAssignmentArray } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignmentArray";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Retrieves all task assignments for a specified task.
 *
 * This operation fetches all assignment records for the given task ID,
 * returning each assignee's ID, the task ID, and the timestamp when the
 * assignment was made.
 *
 * @param props - The parameters containing authentication payload and task
 *   identifier.
 * @param props.pmo - The authenticated PMO user payload.
 * @param props.taskId - The UUID of the task whose assignments are to be
 *   retrieved.
 * @returns An object containing an array of task assignments.
 * @throws {Error} If an unexpected error occurs during database operations.
 */
export async function patchtaskManagementPmoTasksTaskIdAssignments(props: {
  pmo: PmoPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskAssignmentArray> {
  const { taskId } = props;

  const assignments =
    await MyGlobal.prisma.task_management_task_assignments.findMany({
      where: { task_id: taskId },
    });

  return {
    data: assignments.map((assignment) => ({
      id: assignment.id,
      task_id: assignment.task_id,
      assignee_id: assignment.assignee_id,
      assigned_at: toISOStringSafe(assignment.assigned_at),
    })),
  };
}
