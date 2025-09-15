import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalJobSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobSeries";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Update a specific job series within a job group.
 *
 * This function updates fields such as code, name, description, and optionally
 * the parent job group ID and soft deletion timestamp. It verifies that the
 * target job series exists and belongs to the specified job group before
 * updating. Only fields provided in the request body are updated. Dates are
 * handled as ISO 8601 strings branded with tags.Format<'date-time'>. UUIDs for
 * jobGroupId and jobSeriesId are verified in parameters.
 *
 * @param props - Object containing manager payload, jobGroupId, jobSeriesId,
 *   and update body.
 * @param props.manager - Authenticated manager information.
 * @param props.jobGroupId - UUID of the parent job group for verifying
 *   ownership.
 * @param props.jobSeriesId - UUID of the job series to update.
 * @param props.body - Partial update payload conforming to
 *   IJobPerformanceEvalJobSeries.IUpdate.
 * @returns The updated job series object with all relevant fields.
 * @throws {Error} When the job series is not found or does not belong to the
 *   specified job group.
 */
export async function putjobPerformanceEvalManagerJobGroupsJobGroupIdJobSeriesJobSeriesId(props: {
  manager: ManagerPayload;
  jobGroupId: string & tags.Format<"uuid">;
  jobSeriesId: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalJobSeries.IUpdate;
}): Promise<IJobPerformanceEvalJobSeries> {
  const { manager, jobGroupId, jobSeriesId, body } = props;

  // Verify job series exists and belongs to the specified job group
  const existing =
    await MyGlobal.prisma.job_performance_eval_job_series.findUnique({
      where: { id: jobSeriesId },
    });

  if (!existing || existing.job_group_id !== jobGroupId) {
    throw new Error("Job series not found or does not belong to job group");
  }

  // Prepare update data, converting null or undefined correctly
  const updateData = {
    ...(body.job_group_id !== undefined && {
      job_group_id: body.job_group_id === null ? null : body.job_group_id,
    }),
    ...(body.code !== undefined && {
      code: body.code === null ? null : body.code,
    }),
    ...(body.name !== undefined && {
      name: body.name === null ? null : body.name,
    }),
    description:
      body.description === undefined ? undefined : (body.description ?? null),
    ...(body.deleted_at !== undefined && {
      deleted_at: body.deleted_at === null ? null : body.deleted_at,
    }),
  };

  // Update the job series record
  const updated = await MyGlobal.prisma.job_performance_eval_job_series.update({
    where: { id: jobSeriesId },
    data: updateData,
  });

  // Return the updated job series formatted properly
  return {
    id: updated.id as string & tags.Format<"uuid">,
    job_group_id: updated.job_group_id as string & tags.Format<"uuid">,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
