import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Creates a new task assignment for a specified task.
 *
 * This operation allows a PMO user to assign a TPM user to a particular task.
 * The function verifies the existence of the task and the assignee user, then
 * creates the task assignment record with a timestamp.
 *
 * @param props - Object containing pmo authentication payload, taskId, and
 *   assignment data
 * @param props.pmo - Authenticated PMO user payload
 * @param props.taskId - UUID of the task to assign
 * @param props.body - Task assignment creation data including assignee_id
 * @returns The created task assignment record
 * @throws {Error} When the task with taskId does not exist
 * @throws {Error} When the assignee user does not exist
 */
export async function posttaskManagementPmoTasksTaskIdAssignments(props: {
  pmo: PmoPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskAssignment.ICreate;
}): Promise<ITaskManagementTaskAssignment> {
  const { pmo, taskId, body } = props;

  // Check the existence of the specified task
  const task = await MyGlobal.prisma.task_management_tasks.findUnique({
    where: { id: taskId },
  });
  if (task === null) {
    throw new Error("Task not found");
  }

  // Check the existence of the assignee user in TPM users
  const assignee = await MyGlobal.prisma.task_management_tpm.findUnique({
    where: { id: body.assignee_id },
  });
  if (assignee === null) {
    throw new Error("Assignee user not found");
  }

  // Create the task assignment record
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.task_management_task_assignments.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        task_id: taskId,
        assignee_id: body.assignee_id,
        assigned_at: now,
      },
    },
  );

  // Return the created assignment with proper type-safe date
  return {
    id: created.id as string & tags.Format<"uuid">,
    task_id: created.task_id as string & tags.Format<"uuid">,
    assignee_id: created.assignee_id as string & tags.Format<"uuid">,
    assigned_at: toISOStringSafe(created.assigned_at),
  };
}
