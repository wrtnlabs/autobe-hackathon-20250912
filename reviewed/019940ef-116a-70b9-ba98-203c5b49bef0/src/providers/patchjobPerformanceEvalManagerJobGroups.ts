import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalJobGroups } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobGroups";
import { IPageIJobPerformanceEvalJobGroups } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalJobGroups";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Search and retrieve paginated list of job groups
 *
 * This operation allows filtering by code, name, and creation date range.
 * Supports pagination and sorting by allowed keys. Only accessible by
 * authorized managers.
 *
 * @param props - Object containing manager authentication and request body
 * @param props.manager - Authenticated manager making the request
 * @param props.body - Request body containing filtering and pagination
 *   parameters
 * @returns Paginated summary of job groups matching criteria
 * @throws Error if database query fails
 */
export async function patchjobPerformanceEvalManagerJobGroups(props: {
  manager: ManagerPayload;
  body: IJobPerformanceEvalJobGroups.IRequest;
}): Promise<IPageIJobPerformanceEvalJobGroups.ISummary> {
  const { manager, body } = props;

  // Pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  // Build where filter
  const where = {
    deleted_at: null,
    ...(body.code !== undefined && body.code !== null && { code: body.code }),
    ...(body.name !== undefined &&
      body.name !== null && { name: { contains: body.name } }),
    ...((body.createdAfter !== undefined && body.createdAfter !== null) ||
    (body.createdBefore !== undefined && body.createdBefore !== null)
      ? {
          created_at: {
            ...(body.createdAfter !== undefined &&
              body.createdAfter !== null && { gte: body.createdAfter }),
            ...(body.createdBefore !== undefined &&
              body.createdBefore !== null && { lte: body.createdBefore }),
          },
        }
      : {}),
  };

  // Calculate offset for pagination
  const skip = (page - 1) * limit;

  // Allowed sort keys
  const allowedSortKeys = new Set(["code", "name", "created_at"]);

  // Compose order by clause
  const orderBy =
    body.sortKey !== undefined &&
    body.sortKey !== null &&
    allowedSortKeys.has(body.sortKey)
      ? { [body.sortKey]: body.sortOrder === "asc" ? "asc" : "desc" }
      : { created_at: "desc" };

  // Parallel fetch for data and count
  const [results, total] = await Promise.all([
    MyGlobal.prisma.job_performance_eval_job_groups.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.job_performance_eval_job_groups.count({ where }),
  ]);

  // Map to summaries
  const data = results.map((r) => ({
    id: r.id as string & tags.Format<"uuid">,
    code: r.code,
    name: r.name,
  }));

  // Return paginated summary
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
