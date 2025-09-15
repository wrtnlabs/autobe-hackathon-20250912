import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalJobRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobRole";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Update a specific job role in a job series.
 *
 * This endpoint updates details of a job role under a specific job series,
 * allowing modification of code, name, description, and growth level. It
 * verifies the job role belongs to the provided job series ID, and updates the
 * timestamps accordingly.
 *
 * Authorization: Must be performed by a user with 'manager' role.
 *
 * @param props - Object containing manager credentials, job series ID, job role
 *   ID, and update body
 * @returns Updated job role details conforming to IJobPerformanceEvalJobRole
 * @throws {Error} Throws if job role does not exist or does not belong to job
 *   series
 */
export async function putjobPerformanceEvalManagerJobSeriesJobSeriesIdJobRolesJobRoleId(props: {
  manager: ManagerPayload;
  jobSeriesId: string & tags.Format<"uuid">;
  jobRoleId: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalJobRole.IUpdate;
}): Promise<IJobPerformanceEvalJobRole> {
  const { manager, jobSeriesId, jobRoleId, body } = props;
  const now = toISOStringSafe(new Date());

  // Verify that the job role exists and belongs to the specified job series
  const jobRole =
    await MyGlobal.prisma.job_performance_eval_job_roles.findFirstOrThrow({
      where: { id: jobRoleId, job_series_id: jobSeriesId, deleted_at: null },
    });

  // Update the job role with provided fields
  const updated = await MyGlobal.prisma.job_performance_eval_job_roles.update({
    where: { id: jobRoleId },
    data: {
      job_series_id:
        body.job_series_id === null ? null : (body.job_series_id ?? undefined),
      code: body.code === null ? null : (body.code ?? undefined),
      name: body.name === null ? null : (body.name ?? undefined),
      description:
        body.description === null ? null : (body.description ?? undefined),
      growth_level:
        body.growth_level === null ? null : (body.growth_level ?? undefined),
      updated_at: now,
    },
  });

  // Return updated job role, converting Date fields properly
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
