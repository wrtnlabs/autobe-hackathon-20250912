import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalJobRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobRole";
import { IPageIJobPerformanceEvalJobRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalJobRole";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Search and list job roles within a job series with pagination and filtering.
 *
 * This PATCH operation enables searching job roles scoped by jobSeriesId.
 * Supports filtering by name and growth level, with pagination and sorting.
 *
 * @param props - Object containing manager authentication, jobSeriesId, and
 *   request body filters.
 * @returns A paginated summary list of job roles matching the criteria.
 * @throws {Error} When database queries fail or invalid parameters are
 *   provided.
 */
export async function patchjobPerformanceEvalManagerJobSeriesJobSeriesIdJobRoles(props: {
  manager: ManagerPayload;
  jobSeriesId: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalJobRole.IRequest;
}): Promise<IPageIJobPerformanceEvalJobRole.ISummary> {
  const { manager, jobSeriesId, body } = props;

  // Parse pagination parameters with defaults
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  // Construct where clause with required and optional filters
  const where = {
    job_series_id: jobSeriesId,
    deleted_at: null,
    ...(body.name !== undefined &&
      body.name !== null && { name: { contains: body.name } }),
    ...(body.growth_level !== undefined &&
      body.growth_level !== null && { growth_level: body.growth_level }),
  };

  // Parse order_by into Prisma orderBy format, fallback to updated_at desc
  const orderBy = (() => {
    if (!body.order_by) return { updated_at: "desc" };
    const parts = body.order_by.split("_");
    if (parts.length !== 2) return { updated_at: "desc" };
    const [field, order] = parts;
    const allowedFields = new Set(["created_at", "updated_at", "name", "code"]);
    if (!allowedFields.has(field)) return { updated_at: "desc" };
    if (order.toLowerCase() !== "asc" && order.toLowerCase() !== "desc")
      return { updated_at: "desc" };
    return { [field]: order.toLowerCase() };
  })();

  // Calculate skip for pagination
  const skip = (page - 1) * limit;

  // Fetch matching records and total count in parallel
  const [results, total] = await Promise.all([
    MyGlobal.prisma.job_performance_eval_job_roles.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        growth_level: true,
      },
    }),
    MyGlobal.prisma.job_performance_eval_job_roles.count({ where }),
  ]);

  // Map results to summary DTO and build pagination
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      name: item.name,
      code: item.code,
      description: item.description ?? null,
      growth_level: item.growth_level ?? null,
    })),
  };
}
