import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalTaskGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskGroup";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Create a new task group under a specified job role.
 *
 * This operation allows authorized employees to add a structured task group to
 * a given job role using the provided information. The task group will be
 * uniquely identified and linked to its parent job role, with timestamps
 * managed internally.
 *
 * @param props - Object containing the authenticated employee, job role ID, and
 *   the task group creation data
 * @param props.employee - The authenticated employee making the request
 * @param props.jobRoleId - UUID string identifying the parent job role
 * @param props.body - The creation data for the new task group
 * @returns The newly created task group including system-generated fields
 * @throws {Error} When the creation fails due to validation, uniqueness, or
 *   referential integrity errors
 */
export async function postjobPerformanceEvalEmployeeJobRolesJobRoleIdTaskGroups(props: {
  employee: EmployeePayload;
  jobRoleId: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalTaskGroup.ICreate;
}): Promise<IJobPerformanceEvalTaskGroup> {
  const { employee, jobRoleId, body } = props;

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.job_performance_eval_task_groups.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        job_role_id: jobRoleId,
        code: body.code,
        name: body.name,
        description: body.description ?? null,
        created_at: now,
        updated_at: now,
      },
    },
  );

  return {
    id: created.id,
    job_role_id: created.job_role_id,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
