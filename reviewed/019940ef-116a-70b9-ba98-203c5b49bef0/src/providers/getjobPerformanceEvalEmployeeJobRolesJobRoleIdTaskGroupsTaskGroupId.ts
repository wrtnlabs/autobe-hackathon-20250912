import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalTaskGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskGroup";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Retrieves detailed information about a specific task group under a job role.
 *
 * This endpoint fetches the active task group identified by taskGroupId and
 * belonging to the specified jobRoleId from the
 * job_performance_eval_task_groups table. Only non-deleted (deleted_at is null)
 * entries are considered valid.
 *
 * @param props - Object containing authenticated employee and identifiers for
 *   job role and task group.
 * @param props.employee - Authenticated employee payload.
 * @param props.jobRoleId - UUID of the job role to which the task group
 *   belongs.
 * @param props.taskGroupId - UUID of the task group to retrieve.
 * @returns Detailed information of the requested task group.
 * @throws {Error} Throws if the task group is not found or inaccessible.
 */
export async function getjobPerformanceEvalEmployeeJobRolesJobRoleIdTaskGroupsTaskGroupId(props: {
  employee: EmployeePayload;
  jobRoleId: string & tags.Format<"uuid">;
  taskGroupId: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalTaskGroup> {
  const { employee, jobRoleId, taskGroupId } = props;

  const record =
    await MyGlobal.prisma.job_performance_eval_task_groups.findFirstOrThrow({
      where: {
        id: taskGroupId,
        job_role_id: jobRoleId,
        deleted_at: null,
      },
    });

  return {
    id: record.id,
    job_role_id: record.job_role_id,
    code: record.code,
    name: record.name,
    description: record.description ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
