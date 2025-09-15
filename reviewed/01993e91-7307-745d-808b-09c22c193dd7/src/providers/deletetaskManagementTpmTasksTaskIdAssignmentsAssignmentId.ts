import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Deletes a specific task assignment record identified by assignmentId under a
 * given taskId.
 *
 * This operation revokes the assignment by removing it from the database. Only
 * authorized TPM users may perform this operation.
 *
 * @param props - Object containing TPM user payload, taskId and assignmentId.
 * @param props.tpm - Authenticated TPM payload representing the user performing
 *   the deletion.
 * @param props.taskId - UUID of the task to which the assignment belongs.
 * @param props.assignmentId - UUID of the assignment to delete.
 * @throws {Error} When the assignment is not found.
 * @throws {Error} When the assignment does not belong to the specified task.
 */
export async function deletetaskManagementTpmTasksTaskIdAssignmentsAssignmentId(props: {
  tpm: TpmPayload;
  taskId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { taskId, assignmentId } = props;

  const assignment =
    await MyGlobal.prisma.task_management_task_assignments.findUnique({
      where: { id: assignmentId },
    });

  if (!assignment) throw new Error("Assignment not found");

  if (assignment.task_id !== taskId)
    throw new Error("Assignment does not belong to the specified task");

  await MyGlobal.prisma.task_management_task_assignments.delete({
    where: { id: assignmentId },
  });
}
