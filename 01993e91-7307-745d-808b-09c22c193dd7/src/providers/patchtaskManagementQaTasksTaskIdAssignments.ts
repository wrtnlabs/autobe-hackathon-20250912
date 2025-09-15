import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskAssignmentArray } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignmentArray";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Retrieve the list of task assignments for a given task ID.
 *
 * This endpoint returns all assignments associated with the specified task.
 * Assignments include their UUIDs, task references, assignee user IDs, and the
 * timestamp when assigned.
 *
 * Assumes authentication as a QA user.
 *
 * @param props - The function properties including authorized QA payload and
 *   the target task ID.
 * @param props.qa - The authenticated QA user making this request.
 * @param props.taskId - The UUID of the task to retrieve assignments for.
 * @returns An object containing an array of task assignments adhering to
 *   ITaskManagementTaskAssignmentArray.
 * @throws {Error} Throws if the user is unauthorized or if an internal error
 *   occurs.
 */
export async function patchtaskManagementQaTasksTaskIdAssignments(props: {
  qa: QaPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskAssignmentArray> {
  const assignments =
    await MyGlobal.prisma.task_management_task_assignments.findMany({
      where: { task_id: props.taskId },
      select: { id: true, task_id: true, assignee_id: true, assigned_at: true },
    });

  return {
    data: assignments.map((a) => ({
      id: a.id,
      task_id: a.task_id,
      assignee_id: a.assignee_id,
      assigned_at: toISOStringSafe(a.assigned_at),
    })),
  };
}
