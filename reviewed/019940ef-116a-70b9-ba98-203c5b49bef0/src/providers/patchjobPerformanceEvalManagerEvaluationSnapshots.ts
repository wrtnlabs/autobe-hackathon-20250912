import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalEvaluationSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationSnapshots";
import { IPageIJobPerformanceEvalEvaluationSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalEvaluationSnapshots";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Lists paginated evaluation snapshots representing historical combined
 * employee and manager evaluations.
 *
 * This operation supports filtering by evaluation cycle, employee, date ranges,
 * and text search in comments. It returns paginated results sorted by specified
 * fields or by creation date descending by default.
 *
 * Authorization requires a valid manager role.
 *
 * @param props - Object containing manager payload and request body with
 *   filters, pagination, and sorting.
 * @returns Paginated summary of evaluation snapshots matching filter criteria.
 * @throws {Error} When any unexpected error occurs during database operation.
 */
export async function patchjobPerformanceEvalManagerEvaluationSnapshots(props: {
  manager: ManagerPayload;
  body: IJobPerformanceEvalEvaluationSnapshots.IRequest;
}): Promise<IPageIJobPerformanceEvalEvaluationSnapshots.ISummary> {
  const { manager, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const whereClause = {
    deleted_at: null,
    ...(body.filter?.evaluation_cycle_id !== undefined &&
      body.filter?.evaluation_cycle_id !== null && {
        evaluation_cycle_id: body.filter.evaluation_cycle_id,
      }),
    ...(body.filter?.employee_id !== undefined &&
      body.filter?.employee_id !== null && {
        employee_id: body.filter.employee_id,
      }),
    ...((body.filter?.created_after !== undefined &&
      body.filter?.created_after !== null) ||
    (body.filter?.created_before !== undefined &&
      body.filter?.created_before !== null)
      ? {
          created_at: {
            ...(body.filter?.created_after !== undefined &&
              body.filter?.created_after !== null && {
                gte: body.filter.created_after,
              }),
            ...(body.filter?.created_before !== undefined &&
              body.filter?.created_before !== null && {
                lte: body.filter.created_before,
              }),
          },
        }
      : {}),
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { employee_comment: { contains: body.search } },
          { manager_comment: { contains: body.search } },
        ],
      }),
  };

  const orderByClause =
    body.orderBy &&
    (body.orderDirection === "asc" || body.orderDirection === "desc")
      ? { [body.orderBy]: body.orderDirection }
      : { created_at: "desc" };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.job_performance_eval_evaluation_snapshots.findMany({
      where: whereClause,
      orderBy: orderByClause,
      skip,
      take: limit,
      select: {
        id: true,
        evaluation_cycle_id: true,
        employee_id: true,
        performance_score: true,
        knowledge_score: true,
        problem_solving_score: true,
        innovation_score: true,
        manager_performance_score: true,
        manager_knowledge_score: true,
        manager_problem_solving_score: true,
        manager_innovation_score: true,
        employee_comment: true,
        manager_comment: true,
        created_at: true,
        updated_at: true,
      },
    }),

    MyGlobal.prisma.job_performance_eval_evaluation_snapshots.count({
      where: whereClause,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      evaluation_cycle_id: row.evaluation_cycle_id,
      employee_id: row.employee_id,
      performance_score: row.performance_score,
      knowledge_score: row.knowledge_score,
      problem_solving_score: row.problem_solving_score,
      innovation_score: row.innovation_score,
      manager_performance_score: row.manager_performance_score ?? null,
      manager_knowledge_score: row.manager_knowledge_score ?? null,
      manager_problem_solving_score: row.manager_problem_solving_score ?? null,
      manager_innovation_score: row.manager_innovation_score ?? null,
      employee_comment: row.employee_comment ?? null,
      manager_comment: row.manager_comment ?? null,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
