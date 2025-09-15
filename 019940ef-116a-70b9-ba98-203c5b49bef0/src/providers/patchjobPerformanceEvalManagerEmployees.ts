import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalEmployees } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployees";
import { IPageIJobPerformanceEvalEmployees } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalEmployees";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Retrieves a filtered and paginated list of employee summaries for manager
 * viewing.
 *
 * This endpoint allows a manager to search employees by name or email, apply
 * pagination, and sort results by name in ascending or descending order.
 *
 * @param props - An object containing the authenticated manager payload and
 *   request body with filtering options.
 * @param props.manager - Authenticated manager making the request.
 * @param props.body - Request body containing pagination, search, and sorting
 *   parameters.
 * @returns A paginated summary list of employees matching the filtering
 *   criteria.
 * @throws {Error} Throws if database access fails.
 */
export async function patchjobPerformanceEvalManagerEmployees(props: {
  manager: ManagerPayload;
  body: IJobPerformanceEvalEmployees.IRequest;
}): Promise<IPageIJobPerformanceEvalEmployees.ISummary> {
  const { manager, body } = props;

  // Pagination: Convert to branded number types
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  // Build where condition
  const where = {
    deleted_at: null,
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { name: { contains: body.search } },
          { email: { contains: body.search } },
        ],
      }),
  };

  // Determine orderBy
  const orderBy =
    body.order_by_name === "desc" ? { name: "desc" } : { name: "asc" };

  // Perform queries concurrently
  const [employees, total] = await Promise.all([
    MyGlobal.prisma.job_performance_eval_employees.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: { id: true, name: true },
    }),
    MyGlobal.prisma.job_performance_eval_employees.count({ where }),
  ]);

  // Return paginated summary
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: employees.map(({ id, name }) => ({ id, name })),
  };
}
