import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalJobSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobSeries";
import { IPageIJobPerformanceEvalJobSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalJobSeries";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Retrieves a paginated and filtered list of job series under a specified job
 * group.
 *
 * This operation supports searching by code, name, and description with partial
 * matching. Pagination parameters page and limit are supported with sensible
 * defaults. Results are sorted by orderBy parameter if set to 'code' or 'name'
 * (ascending), otherwise sorted by 'created_at' descending.
 *
 * @param props - Object containing manager payload, job group ID, and filter
 *   criteria.
 * @param props.manager - Authenticated manager performing the request.
 * @param props.jobGroupId - UUID of the job group to list job series for.
 * @param props.body - Filter and pagination options complying with IRequest
 *   interface.
 * @returns A paginated summary list of job series matching the search criteria.
 */
export async function patchjobPerformanceEvalManagerJobGroupsJobGroupIdJobSeries(props: {
  manager: ManagerPayload;
  jobGroupId: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalJobSeries.IRequest;
}): Promise<IPageIJobPerformanceEvalJobSeries.ISummary> {
  const { manager, jobGroupId, body } = props;

  const page = body.page === undefined || body.page === null ? 1 : body.page;
  const limit =
    body.limit === undefined || body.limit === null ? 10 : body.limit;

  const whereConditions = {
    job_group_id: jobGroupId,
    deleted_at: null,
    ...(body.code !== undefined && { code: { contains: body.code } }),
    ...(body.name !== undefined && { name: { contains: body.name } }),
    ...(body.description !== undefined
      ? body.description === null
        ? { description: null }
        : { description: { contains: body.description } }
      : {}),
  };

  let orderByField: "code" | "name" | "created_at" = "created_at";
  let orderDirection: "asc" | "desc" = "desc";
  if (body.orderBy !== undefined && body.orderBy !== null) {
    const order = body.orderBy.toLowerCase();
    if (order === "code" || order === "name") {
      orderByField = order;
      orderDirection = "asc";
    }
  }

  // Prisma expects numbers for pagination parameters.
  const currentPage = typeof page === "number" ? page : 1;
  const pageLimit = typeof limit === "number" ? limit : 10;

  const skip = (currentPage - 1) * pageLimit;

  const [results, total] = await Promise.all([
    MyGlobal.prisma.job_performance_eval_job_series.findMany({
      where: whereConditions,
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: pageLimit,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
      },
    }),
    MyGlobal.prisma.job_performance_eval_job_series.count({
      where: whereConditions,
    }),
  ]);

  const data: IJobPerformanceEvalJobSeries.ISummary[] = results.map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    description: item.description ?? undefined,
  }));

  return {
    pagination: {
      current: Number(currentPage),
      limit: Number(pageLimit),
      records: total,
      pages: Math.ceil(total / pageLimit),
    },
    data,
  };
}
