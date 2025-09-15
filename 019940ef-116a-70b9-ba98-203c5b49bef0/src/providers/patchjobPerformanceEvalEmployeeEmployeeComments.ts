import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalEmployeeComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployeeComments";
import { IPageIJobPerformanceEvalEmployeeComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalEmployeeComments";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Search and retrieve a paginated list of employee comments on job performance
 * evaluations.
 *
 * Supports filtering by employee_id, evaluation_cycle_id, and text search on
 * comment field. Implements pagination with page and limit parameters. Only
 * non-deleted comments are fetched.
 *
 * @param props - The properties including authenticated employee payload and
 *   request body filters
 * @param props.employee - The authenticated employee making the request
 * @param props.body - The search and pagination parameters
 * @returns A paginated list of employee comment summaries
 * @throws {Error} Throws if database access fails
 */
export async function patchjobPerformanceEvalEmployeeEmployeeComments(props: {
  employee: EmployeePayload;
  body: IJobPerformanceEvalEmployeeComments.IRequest;
}): Promise<IPageIJobPerformanceEvalEmployeeComments.ISummary> {
  const { employee, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 100) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.employee_id !== undefined &&
      body.employee_id !== null && {
        employee_id: body.employee_id,
      }),
    ...(body.evaluation_cycle_id !== undefined &&
      body.evaluation_cycle_id !== null && {
        evaluation_cycle_id: body.evaluation_cycle_id,
      }),
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search.length > 0 && {
        comment: {
          contains: body.search,
        },
      }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.job_performance_eval_employee_comments.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        employee_id: true,
        evaluation_cycle_id: true,
        comment: true,
      },
    }),
    MyGlobal.prisma.job_performance_eval_employee_comments.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results,
  };
}
