import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalEvaluationScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationScore";
import { IPageIJobPerformanceEvalEvaluationScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalEvaluationScore";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Retrieves a paginated list of job performance evaluation scores filtered and
 * sorted based on the given criteria.
 *
 * @param props - Object containing manager authentication and filtering
 *   criteria
 * @param props.manager - Authenticated manager making the request
 * @param props.body - Request body containing search filters and pagination
 *   info
 * @returns Paginated evaluation scores matching filters
 * @throws {Error} If database queries fail
 */
export async function patchjobPerformanceEvalManagerEvaluationScores(props: {
  manager: ManagerPayload;
  body: IJobPerformanceEvalEvaluationScore.IRequest;
}): Promise<IPageIJobPerformanceEvalEvaluationScore> {
  const { manager, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const validOrderFields = [
    "id",
    "evaluation_id",
    "category",
    "score",
    "created_at",
    "updated_at",
  ];
  const orderByField = validOrderFields.includes(body.order_by ?? "")
    ? body.order_by!
    : "created_at";

  const orderDirection =
    body.order_direction === "asc" || body.order_direction === "desc"
      ? body.order_direction
      : "desc";

  const where: {
    evaluation_id?: string & tags.Format<"uuid">;
    category?: string;
    score?: {
      gte?: number & tags.Type<"int32">;
      lte?: number & tags.Type<"int32">;
    };
  } = {};

  if (body.evaluation_id !== undefined && body.evaluation_id !== null) {
    where.evaluation_id = body.evaluation_id;
  }

  if (body.category !== undefined && body.category !== null) {
    where.category = body.category;
  }

  if (body.min_score !== undefined && body.min_score !== null) {
    where.score = { ...(where.score ?? {}), gte: body.min_score };
  }

  if (body.max_score !== undefined && body.max_score !== null) {
    where.score = { ...(where.score ?? {}), lte: body.max_score };
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.job_performance_eval_evaluation_scores.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
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
    data: results.map((result) => ({
      id: result.id,
      evaluation_id: result.evaluation_id,
      category: result.category,
      score: result.score,
      created_at: toISOStringSafe(result.created_at),
      updated_at: toISOStringSafe(result.updated_at),
    })),
  };
}
