import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalJobRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobRole";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Get detailed information of a specific job role by ID under a job series.
 *
 * This operation fetches full details of the job role scoped within the
 * provided job series ID. It requires a manager to be authenticated and
 * authorized.
 *
 * @param props - Object containing authentication payload and identifiers
 * @param props.manager - Authenticated manager payload
 * @param props.jobSeriesId - UUID of the parent job series
 * @param props.jobRoleId - UUID of the job role
 * @returns Detailed job role entity conforming to IJobPerformanceEvalJobRole
 * @throws {Error} Throws if job role not found under the specified job series
 */
export async function getjobPerformanceEvalManagerJobSeriesJobSeriesIdJobRolesJobRoleId(props: {
  manager: ManagerPayload;
  jobSeriesId: string & tags.Format<"uuid">;
  jobRoleId: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalJobRole> {
  const { manager, jobSeriesId, jobRoleId } = props;

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
    description: record.description ?? undefined,
    growth_level: record.growth_level ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
