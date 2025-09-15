import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Retrieves a specific task assignment by its assignmentId belonging to a task
 * identified by taskId. Only accessible by an authenticated developer.
 *
 * This function performs a database lookup in task_management_task_assignments
 * ensuring the assignment belongs to the specified task, returning the
 * assignment details including assignee ID and assignment timestamp.
 *
 * @param props - Object containing developer authentication and route
 *   parameters
 * @param props.developer - Authenticated developer performing the request
 * @param props.taskId - UUID of the parent task
 * @param props.assignmentId - UUID of the task assignment
 * @returns The task assignment details conforming to
 *   ITaskManagementTaskAssignment
 * @throws {Error} Throws if no matching assignment is found
 */
export async function gettaskManagementDeveloperTasksTaskIdAssignmentsAssignmentId(props: {
  developer: DeveloperPayload;
  taskId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskAssignment> {
  const { developer, taskId, assignmentId } = props;

  const assignment =
    await MyGlobal.prisma.task_management_task_assignments.findFirstOrThrow({
      where: { id: assignmentId, task_id: taskId },
    });

  return {
    id: assignment.id,
    task_id: assignment.task_id,
    assignee_id: assignment.assignee_id,
    assigned_at: toISOStringSafe(assignment.assigned_at),
  };
}
