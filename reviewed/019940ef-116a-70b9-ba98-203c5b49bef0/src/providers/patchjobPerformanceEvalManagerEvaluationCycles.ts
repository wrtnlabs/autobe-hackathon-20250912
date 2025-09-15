import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalEvaluationCycle } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationCycle";
import { IPageIJobPerformanceEvalEvaluationCycle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalEvaluationCycle";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Retrieve filtered, paginated list of job performance evaluation cycles.
 *
 * Enables clients to query evaluation cycles with filters like cycle code,
 * cycle name, date ranges, and active status.
 *
 * Supports soft deletion by excluding records with deleted_at.
 *
 * Pagination and filtering are applied as per request body parameters.
 *
 * Authorization: Requires authenticated manager role.
 *
 * @param props - The manager's authentication and request filter parameters.
 * @param props.manager - Authenticated manager payload.
 * @param props.body - Filtering and pagination criteria.
 * @returns Paginated summary of matched evaluation cycles.
 * @throws Error if database query fails.
 */
export async function patchjobPerformanceEvalManagerEvaluationCycles(props: {
  manager: ManagerPayload;
  body: IJobPerformanceEvalEvaluationCycle.IRequest;
}): Promise<IPageIJobPerformanceEvalEvaluationCycle.ISummary> {
  const { manager, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null as null,
    ...(body.cycle_code !== undefined ? { cycle_code: body.cycle_code } : {}),
    ...(body.cycle_name !== undefined
      ? { cycle_name: { contains: body.cycle_name } }
      : {}),
    ...(body.start_date_from !== undefined && body.start_date_from !== null
      ? { start_date: { gte: body.start_date_from } }
      : {}),
    ...(body.end_date_to !== undefined && body.end_date_to !== null
      ? { end_date: { lte: body.end_date_to } }
      : {}),
    ...(body.is_active !== undefined && body.is_active !== null
      ? { is_active: body.is_active }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.job_performance_eval_evaluation_cycles.findMany({
      where,
      select: {
        id: true,
        cycle_code: true,
        cycle_name: true,
        is_active: true,
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.job_performance_eval_evaluation_cycles.count({ where }),
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
      cycle_code: row.cycle_code,
      cycle_name: row.cycle_name,
      is_active: row.is_active,
    })),
  };
}
