import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalTaskGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskGroup";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Updates an existing task group within the specified job role.
 *
 * Authorized users can modify attributes of a task group, including 'code',
 * 'name', and optionally 'description'. The task group is uniquely identified
 * by 'taskGroupId' and linked to the parent job role via 'jobRoleId'.
 *
 * The operation prevents updates of the parent job role association and handles
 * auditing fields internally.
 *
 * Validation errors such as duplicate codes or invalid IDs will produce
 * suitable HTTP error messages.
 *
 * This endpoint is critical for maintaining an accurate and consistent job
 * structure hierarchy in the system.
 *
 * @param props - Object containing employee authentication, job role ID, task
 *   group ID, and update body.
 * @param props.employee - The authenticated employee making the request.
 * @param props.jobRoleId - The UUID of the parent job role of the task group.
 * @param props.taskGroupId - The UUID of the task group to update.
 * @param props.body - Updated information for the task group.
 * @returns The updated task group object with all fields.
 * @throws {Error} If the task group is not found or does not belong to the
 *   specified job role.
 */
export async function putjobPerformanceEvalEmployeeJobRolesJobRoleIdTaskGroupsTaskGroupId(props: {
  employee: EmployeePayload;
  jobRoleId: string & tags.Format<"uuid">;
  taskGroupId: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalTaskGroup.IUpdate;
}): Promise<IJobPerformanceEvalTaskGroup> {
  const { employee, jobRoleId, taskGroupId, body } = props;

  // Verify the target task group exists with matching jobRoleId
  const taskGroup =
    await MyGlobal.prisma.job_performance_eval_task_groups.findUnique({
      where: { id: taskGroupId },
    });

  if (!taskGroup) {
    throw new Error("Task group not found");
  }

  if (taskGroup.job_role_id !== jobRoleId) {
    throw new Error("Task group does not belong to the specified job role");
  }

  // Prepare and perform the update
  const updatedTaskGroup =
    await MyGlobal.prisma.job_performance_eval_task_groups.update({
      where: { id: taskGroupId },
      data: {
        code: body.code ?? undefined,
        name: body.name ?? undefined,
        description: body.description ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Return the updated task group with proper date conversion
  return {
    id: updatedTaskGroup.id,
    job_role_id: updatedTaskGroup.job_role_id,
    code: updatedTaskGroup.code,
    name: updatedTaskGroup.name,
    description: updatedTaskGroup.description ?? null,
    created_at: toISOStringSafe(updatedTaskGroup.created_at),
    updated_at: toISOStringSafe(updatedTaskGroup.updated_at),
    deleted_at: updatedTaskGroup.deleted_at
      ? toISOStringSafe(updatedTaskGroup.deleted_at)
      : null,
  };
}
