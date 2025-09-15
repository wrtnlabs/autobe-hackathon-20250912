import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Delete a task assignment by assignmentId under a given taskId.
 *
 * This operation validates the PM user's ownership of the project containing
 * the task. If the assignment belongs to the specified task and the PM owns the
 * project, it proceeds to delete the task assignment record from the database.
 *
 * @param props - Operation parameters and authorization info
 * @param props.pm - The PM user payload performing the deletion
 * @param props.taskId - UUID of the target task
 * @param props.assignmentId - UUID of the task assignment to delete
 * @throws {Error} When the assignment is not found
 * @throws {Error} When the assignment does not belong to the specified task
 * @throws {Error} When the PM user does not own the project of the task
 */
export async function deletetaskManagementPmTasksTaskIdAssignmentsAssignmentId(props: {
  pm: PmPayload;
  taskId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { pm, taskId, assignmentId } = props;

  const assignment =
    await MyGlobal.prisma.task_management_task_assignments.findUniqueOrThrow({
      where: { id: assignmentId },
      include: {
        task: {
          select: {
            id: true,
            project: {
              select: {
                owner_id: true,
              },
            },
          },
        },
      },
    });

  if (assignment.task_id !== taskId) {
    throw new Error("Assignment does not belong to the specified task");
  }

  if (assignment.task.project?.owner_id !== pm.id) {
    throw new Error("Unauthorized: You do not own the project of this task");
  }

  await MyGlobal.prisma.task_management_task_assignments.delete({
    where: { id: assignmentId },
  });
}
