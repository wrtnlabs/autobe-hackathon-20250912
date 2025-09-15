import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Update an existing task assignment.
 *
 * This endpoint updates the assignment data for a specific task assignment. It
 * validates that the task assignment exists with the given taskId and
 * assignmentId. Then, it applies updates to task_id, assignee_id, and
 * assigned_at as provided.
 *
 * @param props - Object containing authenticated TPM user, taskId,
 *   assignmentId, and request body
 * @returns The updated task assignment record
 * @throws {Error} When assignment not found or taskId mismatch
 */
export async function puttaskManagementTpmTasksTaskIdAssignmentsAssignmentId(props: {
  tpm: TpmPayload;
  taskId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskAssignment.IUpdate;
}): Promise<ITaskManagementTaskAssignment> {
  const { tpm, taskId, assignmentId, body } = props;

  // Find existing assignment by assignment ID
  const assignment =
    await MyGlobal.prisma.task_management_task_assignments.findUniqueOrThrow({
      where: { id: assignmentId },
    });

  // Check that the taskId matches the task_id of the assignment
  if (assignment.task_id !== taskId) {
    throw new Error(
      `Assignment not found for the provided taskId and assignmentId`,
    );
  }

  // Prepare update data respecting nullable fields
  const updateData: ITaskManagementTaskAssignment.IUpdate = {
    task_id: body.task_id === null ? null : (body.task_id ?? undefined),
    assignee_id:
      body.assignee_id === null ? null : (body.assignee_id ?? undefined),
    assigned_at:
      body.assigned_at === null
        ? null
        : body.assigned_at
          ? toISOStringSafe(body.assigned_at)
          : undefined,
  };

  // Perform update
  const updated = await MyGlobal.prisma.task_management_task_assignments.update(
    {
      where: { id: assignmentId },
      data: updateData,
    },
  );

  // Return updated assignment data, converting Date to string
  return {
    id: updated.id,
    task_id: updated.task_id,
    assignee_id: updated.assignee_id,
    assigned_at: toISOStringSafe(updated.assigned_at),
  };
}
