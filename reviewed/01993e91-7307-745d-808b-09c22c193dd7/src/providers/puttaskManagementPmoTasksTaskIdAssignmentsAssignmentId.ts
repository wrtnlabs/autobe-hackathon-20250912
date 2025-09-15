import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Updates an existing task assignment.
 *
 * This function updates a specific task assignment identified by `assignmentId`
 * under a given task `taskId`. It validates the existence of the assignment and
 * verifies that it belongs to the specified task.
 *
 * Only authorized PMO users can perform this operation.
 *
 * @param props - Object containing PMO payload, taskId, assignmentId, and
 *   update body.
 * @param props.pmo - Authenticated Project Management Officer.
 * @param props.taskId - UUID of the target task.
 * @param props.assignmentId - UUID of the assignment to update.
 * @param props.body - Update data for the assignment; fields are optional and
 *   nullable.
 * @returns The updated task assignment record.
 * @throws {Error} Throws error if assignment is not found or does not belong to
 *   the task.
 */
export async function puttaskManagementPmoTasksTaskIdAssignmentsAssignmentId(props: {
  pmo: PmoPayload;
  taskId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskAssignment.IUpdate;
}): Promise<ITaskManagementTaskAssignment> {
  const { pmo, taskId, assignmentId, body } = props;

  const assignment =
    await MyGlobal.prisma.task_management_task_assignments.findUniqueOrThrow({
      where: { id: assignmentId },
    });

  if (assignment.task_id !== taskId) {
    throw new Error("Task ID does not match the assignment");
  }

  const updated = await MyGlobal.prisma.task_management_task_assignments.update(
    {
      where: { id: assignmentId },
      data: {
        task_id: body.task_id ?? undefined,
        assignee_id: body.assignee_id ?? undefined,
        assigned_at: body.assigned_at ?? undefined,
      },
    },
  );

  return {
    id: updated.id,
    task_id: updated.task_id,
    assignee_id: updated.assignee_id,
    assigned_at: toISOStringSafe(updated.assigned_at),
  };
}
