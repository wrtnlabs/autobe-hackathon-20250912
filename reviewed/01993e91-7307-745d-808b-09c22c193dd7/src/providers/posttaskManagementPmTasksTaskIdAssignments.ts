import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Create a new assignment for a task.
 *
 * Allows a PM user to assign a task to a valid user in the system. It validates
 * that both the task and assignee exist. Assignment record includes a generated
 * UUID and current timestamp.
 *
 * @param props.pm - Authenticated PM user
 * @param props.taskId - UUID of the task to assign
 * @param props.body - Assignment creation data, including assignee_id
 * @returns The created task assignment record
 * @throws {Error} When task is not found
 * @throws {Error} When assignee user does not exist
 */
export async function posttaskManagementPmTasksTaskIdAssignments(props: {
  pm: PmPayload;
  taskId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskAssignment.ICreate;
}): Promise<ITaskManagementTaskAssignment> {
  const { pm, taskId, body } = props;

  // Verify that the task exists
  const task = await MyGlobal.prisma.task_management_tasks.findUnique({
    where: { id: taskId },
  });
  if (task === null) throw new Error("Task not found");

  // Verify assignee existence in any user table
  const assignee = await Promise.any([
    MyGlobal.prisma.task_management_tpm.findUnique({
      where: { id: body.assignee_id },
    }),
    MyGlobal.prisma.task_management_pm.findUnique({
      where: { id: body.assignee_id },
    }),
    MyGlobal.prisma.task_management_pmo.findUnique({
      where: { id: body.assignee_id },
    }),
    MyGlobal.prisma.task_management_developer.findUnique({
      where: { id: body.assignee_id },
    }),
    MyGlobal.prisma.task_management_designer.findUnique({
      where: { id: body.assignee_id },
    }),
    MyGlobal.prisma.task_management_qa.findUnique({
      where: { id: body.assignee_id },
    }),
  ]).catch(() => null);

  if (assignee === null) throw new Error("Assignee user not found");

  // Create the assignment with system-generated id and assigned_at
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

  // Return the created assignment with correctly formatted assigned_at
  return {
    id: created.id,
    task_id: created.task_id,
    assignee_id: created.assignee_id,
    assigned_at: toISOStringSafe(created.assigned_at),
  };
}
