import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalJobGroups } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobGroups";
import { IPageIJobPerformanceEvalJobGroups } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalJobGroups";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Search and retrieve paginated list of job groups.
 *
 * This endpoint retrieves filtered and paginated job groups from the
 * job_performance_eval_job_groups table. Supports filtering by code, optional
 * name pattern, and creation date range. Enables pagination with page and
 * limit. Sorting by selected fields with order direction (asc/desc).
 *
 * Only authenticated employees can access this resource.
 *
 * @param props - Request properties
 * @param props.employee - The authenticated employee making the request
 * @param props.body - The search and pagination parameters
 * @returns Paginated list of job group summaries
 * @throws {Error} When any database operation fails
 */
export async function patchjobPerformanceEvalEmployeeJobGroups(props: {
  employee: EmployeePayload;
  body: IJobPerformanceEvalJobGroups.IRequest;
}): Promise<IPageIJobPerformanceEvalJobGroups.ISummary> {
  const { employee, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  // Build where filter
  const where = {
    code: body.code,
    deleted_at: null,
    ...(body.name !== undefined &&
      body.name !== null && {
        name: { contains: body.name },
      }),
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

  const [results, total] = await Promise.all([
    MyGlobal.prisma.job_performance_eval_job_groups.findMany({
      where,
      orderBy:
        body.sortKey && body.sortOrder
          ? { [body.sortKey]: body.sortOrder }
          : { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        code: true,
        name: true,
      },
    }),
    MyGlobal.prisma.job_performance_eval_job_groups.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      code: item.code,
      name: item.name,
    })),
  };
}
