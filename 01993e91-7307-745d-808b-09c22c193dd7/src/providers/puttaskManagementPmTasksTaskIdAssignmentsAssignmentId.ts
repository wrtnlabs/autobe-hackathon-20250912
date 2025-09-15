import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskAssignment";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Update an existing task assignment.
 *
 * This function updates the task assignment record identified by assignmentId
 * under the specified taskId. Only fields provided in the body are updated,
 * others are left unchanged.
 *
 * @param props - The input properties including authorized pm, taskId,
 *   assignmentId, and update data.
 * @returns The updated task assignment record.
 * @throws Error if the task assignment is not found.
 */
export async function puttaskManagementPmTasksTaskIdAssignmentsAssignmentId(props: {
  pm: PmPayload;
  taskId: string & tags.Format<"uuid">;
  assignmentId: string & tags.Format<"uuid">;
  body: ITaskManagementTaskAssignment.IUpdate;
}): Promise<ITaskManagementTaskAssignment> {
  const { pm, taskId, assignmentId, body } = props;

  const existing =
    await MyGlobal.prisma.task_management_task_assignments.findFirst({
      where: { id: assignmentId, task_id: taskId },
    });
  if (!existing) throw new Error("Task assignment not found");

  const updated = await MyGlobal.prisma.task_management_task_assignments.update(
    {
      where: { id: assignmentId },
      data: {
        task_id: body.task_id === null ? null : (body.task_id ?? undefined),
        assignee_id:
          body.assignee_id === null ? null : (body.assignee_id ?? undefined),
        assigned_at:
          body.assigned_at === null
            ? null
            : body.assigned_at
              ? toISOStringSafe(body.assigned_at)
              : undefined,
      },
    },
  );

  return {
    id: updated.id,
    task_id: updated.task_id,
    assignee_id: updated.assignee_id,
    assigned_at: updated.assigned_at
      ? toISOStringSafe(updated.assigned_at)
      : ("" as string & tags.Format<"date-time">),
  };
}
