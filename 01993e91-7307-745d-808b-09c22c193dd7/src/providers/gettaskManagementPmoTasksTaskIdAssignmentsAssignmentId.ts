import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Retrieve a specific task assignment by assignmentId under the given taskId.
 *
 * This function fetches the task assignment details from the database, ensuring
 * the assignment belongs to the specified task.
 *
 * Authorization is assumed to be verified by the presence of a valid PMO
 * payload.
 *
 * @param props - The input parameters including the authenticated PMO user
 *   payload, taskId, and assignmentId
 * @param props.pmo - The authenticated PMO user payload
 * @param props.taskId - UUID string identifying the parent task
 * @param props.assignmentId - UUID string identifying the target assignment
 * @returns The task assignment details conforming to
 *   ITaskManagementTaskAssignment
 * @throws {Error} Throws if the assignment or task does not exist
 */
export async function gettaskManagementPmoTasksTaskIdAssignmentsAssignmentId(props: {
  pmo: PmoPayload;
  taskId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskAssignment> {
  const { pmo, taskId, assignmentId } = props;

  const assignment =
    await MyGlobal.prisma.task_management_task_assignments.findFirstOrThrow({
      where: {
        id: assignmentId,
        task_id: taskId,
      },
    });

  return {
    id: assignment.id,
    task_id: assignment.task_id,
    assignee_id: assignment.assignee_id,
    assigned_at: toISOStringSafe(assignment.assigned_at),
  };
}
