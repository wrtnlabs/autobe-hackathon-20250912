import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskAssignmentArray } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignmentArray";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Retrieve the list of assignments for a given task identified by taskId.
 *
 * This operation returns all task assignments for the specified task ID. Each
 * assignment includes the unique assignment ID, the task ID, the assignee's
 * user ID (typically a TPM), and the timestamp when the assignment was made.
 *
 * @param props - Object containing the authenticated designer and the target
 *   task ID
 * @param props.designer - The authenticated designer's payload
 * @param props.taskId - UUID identifying the target task
 * @returns An object containing a data array of task assignments
 * @throws {Error} Propagates any database or unexpected errors encountered
 */
export async function patchtaskManagementDesignerTasksTaskIdAssignments(props: {
  designer: DesignerPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskAssignmentArray> {
  const assignments =
    await MyGlobal.prisma.task_management_task_assignments.findMany({
      where: { task_id: props.taskId },
    });

  return {
    data: assignments.map((assignment) => ({
      id: assignment.id as string & tags.Format<"uuid">,
      task_id: assignment.task_id as string & tags.Format<"uuid">,
      assignee_id: assignment.assignee_id as string & tags.Format<"uuid">,
      assigned_at: toISOStringSafe(assignment.assigned_at),
    })),
  };
}
