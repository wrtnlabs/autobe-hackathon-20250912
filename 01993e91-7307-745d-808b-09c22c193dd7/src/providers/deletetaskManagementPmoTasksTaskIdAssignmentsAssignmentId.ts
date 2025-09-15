import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Deletes a specific assignment from a task.
 *
 * This operation removes an assignment record from
 * task_management_task_assignments identified by assignmentId under the
 * specified taskId.
 *
 * Authorization is through the provided PMO user payload.
 *
 * @param props - The function props containing:
 *
 *   - Pmo: The authenticated PMO user payload.
 *   - TaskId: UUID string of the task.
 *   - AssignmentId: UUID string of the assignment to delete.
 *
 * @throws {Error} If the assignment does not exist or does not belong to the
 *   task, or if the task does not exist.
 */
export async function deletetaskManagementPmoTasksTaskIdAssignmentsAssignmentId(props: {
  pmo: PmoPayload;
  taskId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { pmo, taskId, assignmentId } = props;

  // Fetch the assignment, throw if not found
  const assignment =
    await MyGlobal.prisma.task_management_task_assignments.findUniqueOrThrow({
      where: { id: assignmentId },
    });

  // Check that the assignment belongs to the specified task
  if (assignment.task_id !== taskId) {
    throw new Error("Assignment does not belong to the specified task");
  }

  // Verify the task exists
  await MyGlobal.prisma.task_management_tasks.findUniqueOrThrow({
    where: { id: taskId },
  });

  // Proceed with hard delete (no soft delete field in assignment model)
  await MyGlobal.prisma.task_management_task_assignments.delete({
    where: { id: assignmentId },
  });
}
