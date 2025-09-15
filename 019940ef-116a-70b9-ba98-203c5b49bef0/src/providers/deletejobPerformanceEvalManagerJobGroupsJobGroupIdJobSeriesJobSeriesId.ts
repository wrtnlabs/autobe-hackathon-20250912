import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Permanently deletes a specific job series by ID within a job group.
 *
 * This DELETE operation targets the job_performance_eval_job_series table,
 * allowing authorized manager users to hard delete the record. It confirms
 * existence and ownership (by jobGroupId) before deletion.
 *
 * @param props - Object containing manager authentication and identifiers
 * @param props.manager - Authenticated manager performing the deletion
 * @param props.jobGroupId - UUID of the parent job group
 * @param props.jobSeriesId - UUID of the job series to delete
 * @throws {Error} When the specified job series is not found under the job
 *   group
 */
export async function deletejobPerformanceEvalManagerJobGroupsJobGroupIdJobSeriesJobSeriesId(props: {
  manager: ManagerPayload;
  jobGroupId: string & tags.Format<"uuid">;
  jobSeriesId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { manager, jobGroupId, jobSeriesId } = props;

  const found = await MyGlobal.prisma.job_performance_eval_job_series.findFirst(
    {
      where: {
        id: jobSeriesId,
        job_group_id: jobGroupId,
        deleted_at: null,
      },
    },
  );

  if (!found) {
    throw new Error("Job series not found");
  }

  await MyGlobal.prisma.job_performance_eval_job_series.delete({
    where: {
      id: jobSeriesId,
    },
  });
}
