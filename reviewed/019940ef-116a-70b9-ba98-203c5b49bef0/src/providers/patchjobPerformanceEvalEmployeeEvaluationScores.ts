import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalEvaluationScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationScore";
import { IPageIJobPerformanceEvalEvaluationScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalEvaluationScore";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Search and retrieve a paginated list of job performance evaluation scores.
 *
 * This operation supports filtering by evaluation ID, category, and score
 * range, with pagination support and customizable sorting on category, score,
 * or creation date.
 *
 * @param props - The parameters including the authenticated employee and query
 *   filters.
 * @param props.employee - Authenticated employee making the request.
 * @param props.body - Request payload containing filter and pagination options.
 * @returns A paginated list of evaluation scores matching the criteria.
 * @throws {Error} Throws when database operation fails.
 */
export async function patchjobPerformanceEvalEmployeeEvaluationScores(props: {
  employee: EmployeePayload;
  body: IJobPerformanceEvalEvaluationScore.IRequest;
}): Promise<IPageIJobPerformanceEvalEvaluationScore> {
  const { body } = props;

  const page =
    body.page ?? (1 as number & tags.Type<"int32"> & tags.Minimum<0> as number);
  const limit =
    body.limit ??
    (10 as number & tags.Type<"int32"> & tags.Minimum<0> as number);
  const skip = (page - 1) * limit;

  const where = {
    ...(body.evaluation_id !== undefined &&
      body.evaluation_id !== null && { evaluation_id: body.evaluation_id }),
    ...(body.category !== undefined &&
      body.category !== null && { category: body.category }),
    ...(body.min_score !== undefined &&
      body.min_score !== null && { score: { gte: body.min_score } }),
    ...(body.max_score !== undefined &&
      body.max_score !== null && {
        score: {
          ...(body.min_score !== undefined && body.min_score !== null
            ? { gte: body.min_score }
            : {}),
          lte: body.max_score,
        },
      }),
  };

  const orderField = ((): string => {
    if (
      body.order_by === "category" ||
      body.order_by === "score" ||
      body.order_by === "created_at"
    ) {
      return body.order_by;
    }
    return "created_at";
  })();

  const orderDirection = body.order_direction === "asc" ? "asc" : "desc";

  const [results, total] = await Promise.all([
    MyGlobal.prisma.job_performance_eval_evaluation_scores.findMany({
      where,
      orderBy: { [orderField]: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.job_performance_eval_evaluation_scores.count({ where }),
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
      evaluation_id: item.evaluation_id,
      category: item.category,
      score: item.score,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
