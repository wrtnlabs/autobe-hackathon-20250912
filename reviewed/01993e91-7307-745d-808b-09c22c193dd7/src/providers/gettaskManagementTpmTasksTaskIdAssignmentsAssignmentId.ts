import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Retrieve a specific task assignment by assignmentId under a task identified
 * by taskId.
 *
 * This endpoint allows a TPM user to fetch detailed information about a single
 * task assignment, including the assignee's user ID and the timestamp when the
 * assignment was made.
 *
 * @param props - Parameters including TPM authorization, taskId, and
 *   assignmentId
 * @param props.tpm - The authenticated TPM user payload
 * @param props.taskId - The unique identifier of the parent task
 * @param props.assignmentId - The unique identifier of the assignment
 * @returns The task assignment details conforming to
 *   ITaskManagementTaskAssignment
 * @throws {Error} When no assignment record matches the provided IDs
 */
export async function gettaskManagementTpmTasksTaskIdAssignmentsAssignmentId(props: {
  tpm: TpmPayload;
  taskId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTaskAssignment> {
  const { tpm, taskId, assignmentId } = props;

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
