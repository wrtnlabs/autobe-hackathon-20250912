import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalJobRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobRole";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Create a new job role within a specified job series.
 *
 * This operation creates a job role resource linked to a given job series ID.
 * It requires authentication of a manager and valid job role creation data.
 *
 * @param props - Request properties
 * @param props.manager - Authenticated manager performing the creation
 * @param props.jobSeriesId - UUID of the parent job series
 * @param props.body - Job role creation data including code, name, description,
 *   and growth level
 * @returns The created job role entity
 * @throws {Error} When creation fails due to DB issues or invalid inputs
 */
export async function postjobPerformanceEvalManagerJobSeriesJobSeriesIdJobRoles(props: {
  manager: ManagerPayload;
  jobSeriesId: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalJobRole.ICreate;
}): Promise<IJobPerformanceEvalJobRole> {
  const { manager, jobSeriesId, body } = props;

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.job_performance_eval_job_roles.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      job_series_id: jobSeriesId,
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      growth_level: body.growth_level ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    job_series_id: created.job_series_id,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    growth_level: created.growth_level ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: null,
  };
}
