import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalTeamStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTeamStatistic";
import { IPageIJobPerformanceEvalTeamStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalTeamStatistic";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Searches and retrieves paginated job performance evaluation team statistics.
 *
 * This endpoint allows managers to apply filters and pagination to view
 * aggregated scores for teams over specific evaluation cycles. It supports
 * filtering by evaluation cycle ID, team ID, and date ranges, as well as
 * sorting by various average scores or evaluation counts.
 *
 * Authorization: Only accessible by authenticated managers.
 *
 * @param props - Object containing manager payload and request body with
 *   filters and pagination.
 * @param props.manager - Authenticated manager making the request.
 * @param props.body - Request body containing search criteria and pagination
 *   parameters.
 * @returns Paginated summary of team statistics matching the given criteria.
 * @throws {Error} If any unexpected database or application error occurs.
 */
export async function patchjobPerformanceEvalManagerTeamStatistics(props: {
  manager: ManagerPayload;
  body: IJobPerformanceEvalTeamStatistic.IRequest;
}): Promise<IPageIJobPerformanceEvalTeamStatistic.ISummary> {
  const { manager, body } = props;

  const page = body.page === undefined || body.page === null ? 1 : body.page;
  const limit =
    body.limit === undefined || body.limit === null ? 20 : body.limit;
  const skip = (page - 1) * limit;

  const where: any = {
    deleted_at: null,
  };

  if (body.filter) {
    if (
      body.filter.evaluation_cycle_id !== undefined &&
      body.filter.evaluation_cycle_id !== null
    ) {
      where.evaluation_cycle_id = body.filter.evaluation_cycle_id;
    }
    if (body.filter.team_id !== undefined && body.filter.team_id !== null) {
      where.team_id = body.filter.team_id;
    }
    if (
      body.filter.created_after !== undefined &&
      body.filter.created_after !== null
    ) {
      where.created_at = {
        ...where.created_at,
        gte: body.filter.created_after,
      };
    }
    if (
      body.filter.created_before !== undefined &&
      body.filter.created_before !== null
    ) {
      where.created_at = {
        ...where.created_at,
        lte: body.filter.created_before,
      };
    }
  }

  if (
    body.search !== undefined &&
    body.search !== null &&
    body.search.length > 0
  ) {
    where.team_id = { contains: body.search };
  }

  const validOrderByFields = new Set([
    "average_performance_score",
    "average_knowledge_score",
    "average_problem_solving_score",
    "average_innovation_score",
    "evaluation_count",
    "created_at",
    "updated_at",
  ]);

  let orderBy: any = { created_at: "desc" };

  if (body.orderBy && validOrderByFields.has(body.orderBy)) {
    const orderDirection = body.orderDirection === "asc" ? "asc" : "desc";
    orderBy = { [body.orderBy]: orderDirection };
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.job_performance_eval_team_statistics.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.job_performance_eval_team_statistics.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      evaluation_cycle_id: item.evaluation_cycle_id,
      team_id: item.team_id,
      average_performance_score: item.average_performance_score,
      average_knowledge_score: item.average_knowledge_score,
      average_problem_solving_score: item.average_problem_solving_score,
      average_innovation_score: item.average_innovation_score,
      evaluation_count: item.evaluation_count,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
