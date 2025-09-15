import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalSelfEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalSelfEvaluation";
import { IPageIJobPerformanceEvalSelfEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalSelfEvaluation";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Search and retrieve a paginated list of employee self-evaluations.
 *
 * This endpoint supports filtering by employee, evaluation cycle, and score
 * ranges. It returns summarized self-evaluation data optimized for pagination
 * and performance.
 *
 * @param props - Object containing the authenticated employee and request
 *   filters
 * @param props.employee - Authenticated employee payload
 * @param props.body - Filters and pagination parameters for searching
 *   self-evaluations
 * @returns A paginated list of self-evaluation summaries matching the filter
 *   criteria
 * @throws {Error} When database operation fails or parameters are invalid
 */
export async function patchjobPerformanceEvalEmployeeSelfEvaluations(props: {
  employee: EmployeePayload;
  body: IJobPerformanceEvalSelfEvaluation.IRequest;
}): Promise<IPageIJobPerformanceEvalSelfEvaluation.ISummary> {
  const { employee, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  const where: {
    deleted_at: null;
    employee_id?: string & tags.Format<"uuid">;
    evaluation_cycle_id?: string & tags.Format<"uuid">;
    work_performance_score?: { gte?: number; lte?: number };
    knowledge_skill_score?: { gte?: number; lte?: number };
    problem_solving_collab_score?: { gte?: number; lte?: number };
    innovation_score?: { gte?: number; lte?: number };
  } = {
    deleted_at: null,
  };

  if (body.employee_id !== undefined && body.employee_id !== null) {
    where.employee_id = body.employee_id;
  }
  if (
    body.evaluation_cycle_id !== undefined &&
    body.evaluation_cycle_id !== null
  ) {
    where.evaluation_cycle_id = body.evaluation_cycle_id;
  }
  if (
    body.min_work_performance_score !== undefined &&
    body.min_work_performance_score !== null
  ) {
    where.work_performance_score = {
      ...where.work_performance_score,
      gte: Number(body.min_work_performance_score),
    };
  }
  if (
    body.max_work_performance_score !== undefined &&
    body.max_work_performance_score !== null
  ) {
    where.work_performance_score = {
      ...where.work_performance_score,
      lte: Number(body.max_work_performance_score),
    };
  }
  if (
    body.min_knowledge_skill_score !== undefined &&
    body.min_knowledge_skill_score !== null
  ) {
    where.knowledge_skill_score = {
      ...where.knowledge_skill_score,
      gte: Number(body.min_knowledge_skill_score),
    };
  }
  if (
    body.max_knowledge_skill_score !== undefined &&
    body.max_knowledge_skill_score !== null
  ) {
    where.knowledge_skill_score = {
      ...where.knowledge_skill_score,
      lte: Number(body.max_knowledge_skill_score),
    };
  }
  if (
    body.min_problem_solving_collab_score !== undefined &&
    body.min_problem_solving_collab_score !== null
  ) {
    where.problem_solving_collab_score = {
      ...where.problem_solving_collab_score,
      gte: Number(body.min_problem_solving_collab_score),
    };
  }
  if (
    body.max_problem_solving_collab_score !== undefined &&
    body.max_problem_solving_collab_score !== null
  ) {
    where.problem_solving_collab_score = {
      ...where.problem_solving_collab_score,
      lte: Number(body.max_problem_solving_collab_score),
    };
  }
  if (
    body.min_innovation_score !== undefined &&
    body.min_innovation_score !== null
  ) {
    where.innovation_score = {
      ...where.innovation_score,
      gte: Number(body.min_innovation_score),
    };
  }
  if (
    body.max_innovation_score !== undefined &&
    body.max_innovation_score !== null
  ) {
    where.innovation_score = {
      ...where.innovation_score,
      lte: Number(body.max_innovation_score),
    };
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.job_performance_eval_self_evaluations.findMany({
      where,
      orderBy: { evaluation_date: "desc" },
      skip: (page - 1) * limit,
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
    data: results.map((r) => ({
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
