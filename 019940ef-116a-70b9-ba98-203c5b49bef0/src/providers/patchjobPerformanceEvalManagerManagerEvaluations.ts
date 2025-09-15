import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalManagerEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManagerEvaluation";
import { IPageIJobPerformanceEvalManagerEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalManagerEvaluation";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Search and retrieve a filtered, paginated list of manager evaluations.
 *
 * This operation allows an authenticated manager to query their own evaluations
 * with optional filters for employee, evaluation cycle, evaluation date range,
 * and partial matching on overall comments. Pagination and sorting are
 * supported.
 *
 * @param props - The input parameters including the authenticated manager
 *   payload and the filter/pagination request body.
 * @param props.manager - The authenticated manager making the request.
 * @param props.body - The request body containing search filters and pagination
 *   parameters.
 * @returns Paginated summary list of manager evaluations.
 * @throws {Error} When access is unauthorized or unexpected errors occur.
 */
export async function patchjobPerformanceEvalManagerManagerEvaluations(props: {
  manager: ManagerPayload;
  body: IJobPerformanceEvalManagerEvaluation.IRequest;
}): Promise<IPageIJobPerformanceEvalManagerEvaluation.ISummary> {
  const { manager, body } = props;

  const page = body?.page ?? 1;
  const limit = body?.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    manager_id: manager.id,
    deleted_at: null,
  };

  if (body?.employee_id !== undefined && body.employee_id !== null) {
    where.employee_id = body.employee_id;
  }

  if (
    body?.evaluation_cycle_id !== undefined &&
    body.evaluation_cycle_id !== null
  ) {
    where.evaluation_cycle_id = body.evaluation_cycle_id;
  }

  if (body?.overall_comment !== undefined && body.overall_comment !== null) {
    where.overall_comment = { contains: body.overall_comment };
  }

  if (
    (body?.evaluation_date_from !== undefined &&
      body.evaluation_date_from !== null) ||
    (body?.evaluation_date_to !== undefined && body.evaluation_date_to !== null)
  ) {
    where.evaluation_date = {};

    if (
      body.evaluation_date_from !== undefined &&
      body.evaluation_date_from !== null
    ) {
      (where.evaluation_date as Record<string, string>)["gte"] =
        body.evaluation_date_from;
    }

    if (
      body.evaluation_date_to !== undefined &&
      body.evaluation_date_to !== null
    ) {
      (where.evaluation_date as Record<string, string>)["lte"] =
        body.evaluation_date_to;
    }
  }

  const orderByField = body?.order_by ?? "created_at";
  const orderByDirection = body?.sort_direction ?? "desc";

  const [results, total] = await Promise.all([
    MyGlobal.prisma.job_performance_eval_manager_evaluations.findMany({
      where,
      orderBy: { [orderByField]: orderByDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.job_performance_eval_manager_evaluations.count({ where }),
  ]);

  const data = results.map((r) => ({
    id: r.id,
    manager_id: r.manager_id,
    employee_id: r.employee_id,
    evaluation_cycle_id: r.evaluation_cycle_id,
    evaluation_date: toISOStringSafe(r.evaluation_date),
    work_performance_score: r.work_performance_score,
    knowledge_skill_score: r.knowledge_skill_score,
    problem_solving_collab_score: r.problem_solving_collab_score,
    innovation_score: r.innovation_score,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
