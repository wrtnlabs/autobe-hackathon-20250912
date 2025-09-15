import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalJobSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobSeries";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Retrieve a specific job series by ID within a job group.
 *
 * This endpoint returns comprehensive details of the job series identified by
 * `jobSeriesId` under the specified `jobGroupId`.
 *
 * Authorization is enforced for managers; only active managers can access.
 *
 * @param props - Input parameters including authenticated manager and IDs.
 * @param props.manager - Authenticated manager payload.
 * @param props.jobGroupId - UUID of the job group that contains the job series.
 * @param props.jobSeriesId - UUID of the job series to retrieve.
 * @returns Detailed information about the requested job series.
 * @throws {Error} When the manager is unauthorized (not found or deleted).
 * @throws {Error} When the job series is not found under the given job group.
 */
export async function getjobPerformanceEvalManagerJobGroupsJobGroupIdJobSeriesJobSeriesId(props: {
  manager: ManagerPayload;
  jobGroupId: string & tags.Format<"uuid">;
  jobSeriesId: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalJobSeries> {
  const { manager, jobGroupId, jobSeriesId } = props;

  const managerRecord =
    await MyGlobal.prisma.job_performance_eval_managers.findFirst({
      where: {
        id: manager.id,
        deleted_at: null,
      },
    });

  if (managerRecord === null) {
    throw new Error("Unauthorized: manager not found or deleted");
  }

  const jobSeries =
    await MyGlobal.prisma.job_performance_eval_job_series.findFirst({
      where: {
        id: jobSeriesId,
        job_group_id: jobGroupId,
        deleted_at: null,
      },
    });

  if (jobSeries === null) {
    throw new Error("Job series not found");
  }

  return {
    id: jobSeries.id,
    job_group_id: jobSeries.job_group_id,
    code: jobSeries.code,
    name: jobSeries.name,
    description: jobSeries.description ?? undefined,
    created_at: toISOStringSafe(jobSeries.created_at),
    updated_at: toISOStringSafe(jobSeries.updated_at),
    deleted_at: jobSeries.deleted_at
      ? toISOStringSafe(jobSeries.deleted_at)
      : null,
  };
}
