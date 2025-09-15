import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Deletes a job role permanently from the given job series by job role ID.
 *
 * This operation removes the job role record entirely from the database. Users
 * with 'employee' role can perform this operation.
 *
 * @param props - Object containing employee user and job identifiers
 * @param props.employee - Authenticated employee
 * @param props.jobSeriesId - UUID string of the job series
 * @param props.jobRoleId - UUID string of the job role
 * @throws {Error} If the job role does not exist in the specified job series
 */
export async function deletejobPerformanceEvalEmployeeJobSeriesJobRolesJobRoleId(props: {
  employee: EmployeePayload;
  jobSeriesId: string & tags.Format<"uuid">;
  jobRoleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { employee, jobSeriesId, jobRoleId } = props;

  const jobRole =
    await MyGlobal.prisma.job_performance_eval_job_roles.findFirst({
      where: { id: jobRoleId, job_series_id: jobSeriesId },
    });

  if (!jobRole) {
    throw new Error("Job role not found");
  }

  await MyGlobal.prisma.job_performance_eval_job_roles.delete({
    where: { id: jobRoleId },
  });
}
