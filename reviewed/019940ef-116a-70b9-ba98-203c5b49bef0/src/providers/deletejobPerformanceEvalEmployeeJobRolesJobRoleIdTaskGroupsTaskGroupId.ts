import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Deletes an existing task group under a job role permanently.
 *
 * This operation removes the task group with the given 'taskGroupId' linked to
 * the 'jobRoleId'. It performs a hard delete, permanently removing associated
 * data.
 *
 * Only authorized employees may perform this operation.
 *
 * @param props - Object containing the authenticated employee and path
 *   parameters
 * @param props.employee - The authenticated employee performing the deletion
 * @param props.jobRoleId - UUID of the parent job role
 * @param props.taskGroupId - UUID of the task group to delete
 * @returns Void
 * @throws {Error} Throws if the task group does not exist or does not belong to
 *   the job role
 */
export async function deletejobPerformanceEvalEmployeeJobRolesJobRoleIdTaskGroupsTaskGroupId(props: {
  employee: EmployeePayload;
  jobRoleId: string & tags.Format<"uuid">;
  taskGroupId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { employee, jobRoleId, taskGroupId } = props;

  // Ensure the task group exists and belongs to the job role
  await MyGlobal.prisma.job_performance_eval_task_groups.findFirstOrThrow({
    where: {
      id: taskGroupId,
      job_role_id: jobRoleId,
      deleted_at: null,
    },
  });

  // Hard delete the task group
  await MyGlobal.prisma.job_performance_eval_task_groups.delete({
    where: {
      id: taskGroupId,
    },
  });
}
