import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalJobRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobRole";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Updates a specific job role within a given job series.
 *
 * This operation updates the details of a job role such as code, name,
 * description, growth level, and timestamps. It enforces that the job role
 * belongs to the specified job series and that updates conform to the provided
 * DTO.
 *
 * Authorization: Only authenticated employees can perform this operation.
 *
 * @param props - Object containing employee auth, jobSeriesId, jobRoleId, and
 *   update body
 * @param props.employee - Authenticated employee performing the update
 * @param props.jobSeriesId - ID of the job series to which the job role belongs
 * @param props.jobRoleId - ID of the job role to update
 * @param props.body - Update data containing optional fields to modify
 * @returns The updated job role details
 * @throws {Error} When the job role is not found
 * @throws {Error} When the job role does not belong to the specified job series
 */
export async function putjobPerformanceEvalEmployeeJobSeriesJobSeriesIdJobRolesJobRoleId(props: {
  employee: EmployeePayload;
  jobSeriesId: string & tags.Format<"uuid">;
  jobRoleId: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalJobRole.IUpdate;
}): Promise<IJobPerformanceEvalJobRole> {
  const { employee, jobSeriesId, jobRoleId, body } = props;

  const jobRole =
    await MyGlobal.prisma.job_performance_eval_job_roles.findUnique({
      where: { id: jobRoleId },
    });

  if (!jobRole) throw new Error("Job role not found");
  if (jobRole.job_series_id !== jobSeriesId) {
    throw new Error("Job role does not belong to the specified job series");
  }

  const updated = await MyGlobal.prisma.job_performance_eval_job_roles.update({
    where: { id: jobRoleId },
    data: {
      job_series_id: body.job_series_id ?? undefined,
      code: body.code ?? undefined,
      name: body.name ?? undefined,
      description: body.description ?? undefined,
      growth_level: body.growth_level ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    job_series_id: updated.job_series_id,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? null,
    growth_level: updated.growth_level ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
