import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalJobRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobRole";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Get detailed information of a specific job role by ID under a job series.
 *
 * Retrieves the job role identified by jobRoleId and scoped within the parent
 * job series identified by jobSeriesId.
 *
 * Authorization is assumed to be handled upstream and requires an employee.
 *
 * @param props - Object containing employee authorization and identifiers
 * @param props.employee - Authenticated employee payload
 * @param props.jobSeriesId - UUID of the parent job series
 * @param props.jobRoleId - UUID of the target job role
 * @returns Promise resolving to the detailed job role entity
 * @throws {Error} Throws if no matching job role is found or on database errors
 */
export async function getjobPerformanceEvalEmployeeJobSeriesJobSeriesIdJobRolesJobRoleId(props: {
  employee: EmployeePayload;
  jobSeriesId: string & tags.Format<"uuid">;
  jobRoleId: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalJobRole> {
  const { employee, jobSeriesId, jobRoleId } = props;

  const record =
    await MyGlobal.prisma.job_performance_eval_job_roles.findFirstOrThrow({
      where: {
        id: jobRoleId,
        job_series_id: jobSeriesId,
        deleted_at: null,
      },
    });

  return {
    id: record.id,
    job_series_id: record.job_series_id,
    code: record.code,
    name: record.name,
    description: record.description ?? null,
    growth_level: record.growth_level ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
