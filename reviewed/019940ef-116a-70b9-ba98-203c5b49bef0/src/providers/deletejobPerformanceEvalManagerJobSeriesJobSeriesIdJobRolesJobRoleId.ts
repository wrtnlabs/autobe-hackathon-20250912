import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Permanently delete a job role from a job series.
 *
 * This operation removes the job role record entirely from the database in a
 * hard delete. It verifies that the job role exists within the specified job
 * series before deletion.
 *
 * Authorization: Requires an authenticated manager.
 *
 * @param props - Request properties
 * @param props.manager - The authenticated manager performing the deletion
 * @param props.jobSeriesId - UUID of the job series containing the job role
 * @param props.jobRoleId - UUID of the job role to delete
 * @throws {Error} Throws if the job role does not exist or does not belong to
 *   the given job series
 */
export async function deletejobPerformanceEvalManagerJobSeriesJobSeriesIdJobRolesJobRoleId(props: {
  manager: ManagerPayload;
  jobSeriesId: string & tags.Format<"uuid">;
  jobRoleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { manager, jobSeriesId, jobRoleId } = props;

  // Confirm existence of the job role within the specified job series
  await MyGlobal.prisma.job_performance_eval_job_roles.findFirstOrThrow({
    where: {
      id: jobRoleId,
      job_series_id: jobSeriesId,
    },
  });

  // Perform hard deletion
  await MyGlobal.prisma.job_performance_eval_job_roles.delete({
    where: { id: jobRoleId },
  });
}
