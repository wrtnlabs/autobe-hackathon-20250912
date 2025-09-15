import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalSelfEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalSelfEvaluation";
import { IPageIJobPerformanceEvalSelfEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalSelfEvaluation";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Search and retrieve paginated employee self-evaluations.
 *
 * This operation allows authorized managers to fetch a filtered and paginated
 * list of self-evaluation summaries submitted by employees in specific
 * evaluation cycles. It supports filters such as employee ID, evaluation cycle
 * ID, and score minimums and maximums for various evaluation categories.
 *
 * @param props - Object containing the authenticated manager and search
 *   criteria body.
 * @param props.manager - The authenticated manager making the request.
 * @param props.body - The search criteria for filtering self-evaluations.
 * @returns A paginated summary list of self-evaluations matching the given
 *   filters.
 * @throws {Error} Throws if database query fails.
 */
export async function patchjobPerformanceEvalManagerSelfEvaluations(props: {
  manager: ManagerPayload;
  body: IJobPerformanceEvalSelfEvaluation.IRequest;
}): Promise<IPageIJobPerformanceEvalSelfEvaluation.ISummary> {
  const { manager, body } = props;

  const where = {
    deleted_at: null,
    ...(body.employee_id !== undefined &&
      body.employee_id !== null && { employee_id: body.employee_id }),
    ...(body.evaluation_cycle_id !== undefined &&
      body.evaluation_cycle_id !== null && {
        evaluation_cycle_id: body.evaluation_cycle_id,
      }),
    ...(body.min_work_performance_score !== undefined &&
      body.min_work_performance_score !== null && {
        work_performance_score: { gte: body.min_work_performance_score },
      }),
    ...(body.max_work_performance_score !== undefined &&
      body.max_work_performance_score !== null && {
        work_performance_score: { lte: body.max_work_performance_score },
      }),
    ...(body.min_knowledge_skill_score !== undefined &&
      body.min_knowledge_skill_score !== null && {
        knowledge_skill_score: { gte: body.min_knowledge_skill_score },
      }),
    ...(body.max_knowledge_skill_score !== undefined &&
      body.max_knowledge_skill_score !== null && {
        knowledge_skill_score: { lte: body.max_knowledge_skill_score },
      }),
    ...(body.min_problem_solving_collab_score !== undefined &&
      body.min_problem_solving_collab_score !== null && {
        problem_solving_collab_score: {
          gte: body.min_problem_solving_collab_score,
        },
      }),
    ...(body.max_problem_solving_collab_score !== undefined &&
      body.max_problem_solving_collab_score !== null && {
        problem_solving_collab_score: {
          lte: body.max_problem_solving_collab_score,
        },
      }),
    ...(body.min_innovation_score !== undefined &&
      body.min_innovation_score !== null && {
        innovation_score: { gte: body.min_innovation_score },
      }),
    ...(body.max_innovation_score !== undefined &&
      body.max_innovation_score !== null && {
        innovation_score: { lte: body.max_innovation_score },
      }),
  };

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    MyGlobal.prisma.job_performance_eval_self_evaluations.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        employee_id: true,
        evaluation_cycle_id: true,
        evaluation_date: true,
        work_performance_score: true,
        knowledge_skill_score: true,
        problem_solving_collab_score: true,
        innovation_score: true,
      },
    }),
    MyGlobal.prisma.job_performance_eval_self_evaluations.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((r) => ({
      id: r.id,
      employee_id: r.employee_id,
      evaluation_cycle_id: r.evaluation_cycle_id,
      evaluation_date: toISOStringSafe(r.evaluation_date),
      work_performance_score: r.work_performance_score,
      knowledge_skill_score: r.knowledge_skill_score,
      problem_solving_collab_score: r.problem_solving_collab_score,
      innovation_score: r.innovation_score,
    })),
  };
}
