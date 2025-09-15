import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalTeamStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTeamStatistic";
import { IPageIJobPerformanceEvalTeamStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalTeamStatistic";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Searches and retrieves paginated job performance evaluation team statistics.
 *
 * This operation allows filtering by evaluation cycle ID, team ID, creation
 * date range, and supports sorting by various average score fields and
 * evaluation count.
 *
 * The result is paginated according to provided page and limit parameters.
 *
 * Soft deleted records (where deleted_at is not null) are excluded.
 *
 * @param props - The function parameter object
 * @param props.employee - The authenticated employee payload
 * @param props.body - The request body containing filter, pagination, and
 *   sorting options
 * @returns A paginated list of team statistics matching the search criteria
 * @throws {Error} Throws if database access fails or parameters are invalid
 */
export async function patchjobPerformanceEvalEmployeeTeamStatistics(props: {
  employee: EmployeePayload;
  body: IJobPerformanceEvalTeamStatistic.IRequest;
}): Promise<IPageIJobPerformanceEvalTeamStatistic.ISummary> {
  const { employee, body } = props;

  const page: number = body.page ?? 1;
  const limit: number = body.limit ?? 10;

  const where: {
    deleted_at: null;
    evaluation_cycle_id?: string & tags.Format<"uuid">;
    team_id?: string;
    created_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = {
    deleted_at: null,
  };

  if (
    body.filter?.evaluation_cycle_id !== undefined &&
    body.filter?.evaluation_cycle_id !== null
  ) {
    where.evaluation_cycle_id = body.filter.evaluation_cycle_id;
  }
  if (body.filter?.team_id !== undefined && body.filter?.team_id !== null) {
    where.team_id = body.filter.team_id;
  }
  if (
    (body.filter?.created_after !== undefined &&
      body.filter?.created_after !== null) ||
    (body.filter?.created_before !== undefined &&
      body.filter?.created_before !== null)
  ) {
    where.created_at = {};
    if (
      body.filter?.created_after !== undefined &&
      body.filter?.created_after !== null
    ) {
      where.created_at.gte = body.filter.created_after;
    }
    if (
      body.filter?.created_before !== undefined &&
      body.filter?.created_before !== null
    ) {
      where.created_at.lte = body.filter.created_before;
    }
  }

  const orderFields = [
    "average_performance_score",
    "average_knowledge_score",
    "average_problem_solving_score",
    "average_innovation_score",
    "evaluation_count",
    "created_at",
  ];

  const orderByField = orderFields.includes(body.orderBy ?? "")
    ? body.orderBy
    : "created_at";
  const orderDirection =
    body.orderDirection === "asc" || body.orderDirection === "desc"
      ? body.orderDirection
      : "desc";

  const [results, total] = await Promise.all([
    MyGlobal.prisma.job_performance_eval_team_statistics.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.job_performance_eval_team_statistics.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((record) => ({
      id: record.id,
      evaluation_cycle_id: record.evaluation_cycle_id,
      team_id: record.team_id,
      average_performance_score: record.average_performance_score,
      average_knowledge_score: record.average_knowledge_score,
      average_problem_solving_score: record.average_problem_solving_score,
      average_innovation_score: record.average_innovation_score,
      evaluation_count: record.evaluation_count,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
  };
}
