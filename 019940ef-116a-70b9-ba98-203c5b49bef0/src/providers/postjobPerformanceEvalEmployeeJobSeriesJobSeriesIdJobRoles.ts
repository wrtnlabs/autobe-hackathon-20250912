import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalJobRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobRole";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Create a new job role under a specified job series.
 *
 * This endpoint allows an authenticated employee to add a new job role linked
 * to the specified job series identified by `jobSeriesId`.
 *
 * The request body contains the necessary details for the new job role,
 * including code, name, and optional description and growth level.
 *
 * Server generates and manages timestamps for record creation and update.
 *
 * @param props - Object containing the employee payload, job series ID, and new
 *   job role creation data.
 * @param props.employee - Authenticated employee performing the operation.
 * @param props.jobSeriesId - UUID of the parent job series.
 * @param props.body - The job role creation data adhering to
 *   IJobPerformanceEvalJobRole.ICreate.
 * @returns The newly created job role entity.
 * @throws {Error} If the creation operation fails.
 */
export async function postjobPerformanceEvalEmployeeJobSeriesJobSeriesIdJobRoles(props: {
  employee: EmployeePayload;
  jobSeriesId: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalJobRole.ICreate;
}): Promise<IJobPerformanceEvalJobRole> {
  const { employee, jobSeriesId, body } = props;
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
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
