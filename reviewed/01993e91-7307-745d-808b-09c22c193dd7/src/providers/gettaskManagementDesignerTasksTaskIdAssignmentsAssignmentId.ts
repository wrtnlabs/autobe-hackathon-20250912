import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Retrieves a specific task assignment by its assignmentId under a given
 * taskId.
 *
 * This function fetches the assignment details including its id, task
 * reference, assignee id, and the timestamp when the assignment was made.
 *
 * Authorization is based on the designer role provided externally.
 *
 * @param props - Object containing the designer payload and identifiers
 * @param props.designer - The authenticated designer making the request
 * @param props.taskId - UUID of the parent task
 * @param props.assignmentId - UUID of the task assignment to retrieve
 * @returns The found task assignment with properly formatted fields
 * @throws {Error} Throws if the assignment or task does not exist
 */
export async function gettaskManagementDesignerTasksTaskIdAssignmentsAssignmentId(props: {
  designer: DesignerPayload;
  taskId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskAssignment> {
  const { designer, taskId, assignmentId } = props;

  const record =
    await MyGlobal.prisma.task_management_task_assignments.findFirstOrThrow({
      where: {
        id: assignmentId,
        task_id: taskId,
      },
    });

  return {
    id: record.id,
    task_id: record.task_id,
    assignee_id: record.assignee_id,
    assigned_at: toISOStringSafe(record.assigned_at),
  };
}
