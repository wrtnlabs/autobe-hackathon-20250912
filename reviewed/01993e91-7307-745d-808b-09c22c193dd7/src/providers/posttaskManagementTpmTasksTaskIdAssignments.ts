import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Creates a new task assignment for a specified task.
 *
 * Verifies that the task and assignee TPM user exist and are valid. Sets the
 * assignment timestamp to the current system time.
 *
 * @param props - Contains the TPM user payload, task ID, and assignment
 *   creation data
 * @param props.tpm - The authorized TPM user payload
 * @param props.taskId - The UUID of the task to assign
 * @param props.body - The task assignment creation data including assignee ID
 * @returns The created task assignment record conforming to
 *   ITaskManagementTaskAssignment
 * @throws {Error} If the specified task does not exist
 * @throws {Error} If the assignee does not exist or is marked as deleted
 */
export async function posttaskManagementTpmTasksTaskIdAssignments(props: {
  tpm: TpmPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskAssignment.ICreate;
}): Promise<ITaskManagementTaskAssignment> {
  const { tpm, taskId, body } = props;

  // Verify task existence
  const task = await MyGlobal.prisma.task_management_tasks.findUnique({
    where: { id: taskId },
    select: { id: true },
  });
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  // Verify assignee existence and active status
  const assignee = await MyGlobal.prisma.task_management_tpm.findUnique({
    where: { id: body.assignee_id },
    select: { id: true, deleted_at: true },
  });
  if (!assignee || assignee.deleted_at !== null) {
    throw new Error(`Assignee not found or is deleted: ${body.assignee_id}`);
  }

  // Create assignment with current timestamp
  const assignedAt = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.task_management_task_assignments.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        task_id: taskId,
        assignee_id: body.assignee_id,
        assigned_at: assignedAt,
      },
    },
  );

  return {
    id: created.id as string & tags.Format<"uuid">,
    task_id: created.task_id as string & tags.Format<"uuid">,
    assignee_id: created.assignee_id as string & tags.Format<"uuid">,
    assigned_at: assignedAt,
  };
}
