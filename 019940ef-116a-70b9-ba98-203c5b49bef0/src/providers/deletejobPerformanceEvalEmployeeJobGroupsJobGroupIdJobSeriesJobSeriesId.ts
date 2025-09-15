import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Permanently deletes a specific job series within a job group.
 *
 * This function performs a hard delete operation on the
 * job_performance_eval_job_series table. It first verifies the existence of the
 * job series identified by jobSeriesId under the jobGroupId, ensuring it is not
 * soft-deleted.
 *
 * Only authorized employees may perform this operation.
 *
 * @param props - The properties object containing employee authentication and
 *   path parameters.
 * @param props.employee - The authenticated employee payload.
 * @param props.jobGroupId - The UUID of the parent job group.
 * @param props.jobSeriesId - The UUID of the job series to be deleted.
 * @throws {Error} If the specified job series does not exist or is soft
 *   deleted.
 */
export async function deletejobPerformanceEvalEmployeeJobGroupsJobGroupIdJobSeriesJobSeriesId(props: {
  employee: EmployeePayload;
  jobGroupId: string & tags.Format<"uuid">;
  jobSeriesId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { employee, jobGroupId, jobSeriesId } = props;

  const jobSeries =
    await MyGlobal.prisma.job_performance_eval_job_series.findFirst({
      where: {
        id: jobSeriesId,
        job_group_id: jobGroupId,
        deleted_at: null,
      },
    });

  if (!jobSeries) {
    throw new Error(
      `Job series not found with id: ${jobSeriesId} in job group: ${jobGroupId}`,
    );
  }

  await MyGlobal.prisma.job_performance_eval_job_series.delete({
    where: { id: jobSeriesId },
  });
}
