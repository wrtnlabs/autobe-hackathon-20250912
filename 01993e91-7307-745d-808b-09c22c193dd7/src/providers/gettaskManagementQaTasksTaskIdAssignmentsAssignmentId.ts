import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Retrieve a specific assignment by assignmentId for a task by taskId.
 *
 * This operation fetches the task assignment record from the database and
 * ensures it belongs to the specified task, authorized by QA user.
 *
 * @param props - The properties including authenticated QA user, task ID, and
 *   assignment ID.
 * @param props.qa - The authenticated QA user making the request.
 * @param props.taskId - UUID of the parent task.
 * @param props.assignmentId - UUID of the target assignment.
 * @returns The task assignment details conforming to
 *   ITaskManagementTaskAssignment.
 * @throws {Error} When the assignment is not found.
 * @throws {Error} When the assignment does not belong to the specified task.
 */
export async function gettaskManagementQaTasksTaskIdAssignmentsAssignmentId(props: {
  qa: QaPayload;
  taskId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskAssignment> {
  const { qa, taskId, assignmentId } = props;

  const assignment =
    await MyGlobal.prisma.task_management_task_assignments.findUniqueOrThrow({
      where: { id: assignmentId },
    });

  if (assignment.task_id !== taskId) {
    throw new Error(
      "Unauthorized access: assignment does not belong to the specified task",
    );
  }

  return {
    id: assignment.id,
    task_id: assignment.task_id,
    assignee_id: assignment.assignee_id,
    assigned_at: toISOStringSafe(assignment.assigned_at),
  };
}
