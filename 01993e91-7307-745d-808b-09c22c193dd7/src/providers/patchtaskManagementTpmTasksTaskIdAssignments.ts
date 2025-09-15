import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskAssignmentArray } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignmentArray";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Retrieves the list of task assignments for a specific task.
 *
 * This operation fetches all task assignments linked to the specified task ID.
 * It verifies the existence of the task before querying assignments. Each
 * assignment includes identifiers and the assignment timestamp.
 *
 * Authorization is enforced via the TPM user payload provided.
 *
 * @param props - Object containing the authorized TPM user and task ID.
 * @param props.tpm - Authenticated TPM user payload.
 * @param props.taskId - UUID of the task whose assignments are retrieved.
 * @returns An object containing an array of task assignments.
 * @throws {Error} Throws if the specified task does not exist.
 */
export async function patchtaskManagementTpmTasksTaskIdAssignments(props: {
  tpm: TpmPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskAssignmentArray> {
  const { tpm, taskId } = props;

  // Verify task existence
  await MyGlobal.prisma.task_management_tasks.findUniqueOrThrow({
    where: { id: taskId },
  });

  // Fetch all task assignments for the task
  const assignments =
    await MyGlobal.prisma.task_management_task_assignments.findMany({
      where: { task_id: taskId },
      select: {
        id: true,
        task_id: true,
        assignee_id: true,
        assigned_at: true,
      },
    });

  // Return with assigned_at converted to ISO string format
  return {
    data: assignments.map((assignment) => ({
      id: assignment.id,
      task_id: assignment.task_id,
      assignee_id: assignment.assignee_id,
      assigned_at: toISOStringSafe(assignment.assigned_at),
    })),
  };
}
