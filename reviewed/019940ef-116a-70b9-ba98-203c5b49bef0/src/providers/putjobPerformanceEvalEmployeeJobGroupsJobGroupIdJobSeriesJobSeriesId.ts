import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalJobSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobSeries";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Update a specific job series within a job group.
 *
 * This operation updates the fields of an existing job series identified by
 * jobSeriesId and belonging to a specific job group jobGroupId. The update
 * respects nullability rules and ensures timestamps are correctly set.
 *
 * Authorization is required as the operation is performed by an authenticated
 * employee.
 *
 * @param props - Object containing employee payload, jobGroupId, jobSeriesId,
 *   and update body
 * @returns The updated job series entity with all fields properly formatted
 * @throws {Error} If the job series does not exist under the specified job
 *   group
 */
export async function putjobPerformanceEvalEmployeeJobGroupsJobGroupIdJobSeriesJobSeriesId(props: {
  employee: EmployeePayload;
  jobGroupId: string & tags.Format<"uuid">;
  jobSeriesId: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalJobSeries.IUpdate;
}): Promise<IJobPerformanceEvalJobSeries> {
  const { employee, jobGroupId, jobSeriesId, body } = props;

  // Verify existence of the job series under the given job group
  const existing =
    await MyGlobal.prisma.job_performance_eval_job_series.findFirst({
      where: {
        id: jobSeriesId,
        job_group_id: jobGroupId,
        deleted_at: null,
      },
    });
  if (!existing)
    throw new Error("Job series not found for the given job group.");

  // Prepare updated data, converting nullables correctly
  const now = toISOStringSafe(new Date());

  return await MyGlobal.prisma.job_performance_eval_job_series
    .update({
      where: { id: jobSeriesId },
      data: {
        ...(body.job_group_id !== undefined &&
          body.job_group_id !== null && { job_group_id: body.job_group_id }),
        ...(body.code !== undefined &&
          body.code !== null && { code: body.code }),
        ...(body.name !== undefined &&
          body.name !== null && { name: body.name }),
        description:
          body.description === undefined ? undefined : body.description,
        deleted_at: body.deleted_at === undefined ? undefined : body.deleted_at,
        updated_at: now,
      },
    })
    .then((updated) => ({
      id: updated.id,
      job_group_id: updated.job_group_id,
      code: updated.code,
      name: updated.name,
      description: updated.description ?? null,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at: updated.deleted_at
        ? toISOStringSafe(updated.deleted_at)
        : null,
    }));
}
