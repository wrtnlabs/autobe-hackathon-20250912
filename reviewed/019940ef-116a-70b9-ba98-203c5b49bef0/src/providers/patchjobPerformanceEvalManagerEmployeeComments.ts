import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalEmployeeComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployeeComments";
import { IPageIJobPerformanceEvalEmployeeComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalEmployeeComments";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Searches and retrieves a paginated list of employee comments on job
 * performance evaluations.
 *
 * Supports filtering by employee ID, evaluation cycle ID, and textual search on
 * comments. Applies pagination with default values if parameters are omitted.
 * Only includes active (non-deleted) records.
 *
 * @param props - Object containing the authenticated manager and search
 *   parameters.
 * @param props.manager - Authenticated manager payload.
 * @param props.body - Search and pagination criteria.
 * @returns Paginated summary list of employee comments.
 * @throws {Error} If any database operation fails.
 */
export async function patchjobPerformanceEvalManagerEmployeeComments(props: {
  manager: ManagerPayload;
  body: IJobPerformanceEvalEmployeeComments.IRequest;
}): Promise<IPageIJobPerformanceEvalEmployeeComments.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.employee_id !== undefined &&
      body.employee_id !== null && { employee_id: body.employee_id }),
    ...(body.evaluation_cycle_id !== undefined &&
      body.evaluation_cycle_id !== null && {
        evaluation_cycle_id: body.evaluation_cycle_id,
      }),
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search !== "" && { comment: { contains: body.search } }),
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
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: results.map((comment) => ({
      id: comment.id as string & tags.Format<"uuid">,
      employee_id: comment.employee_id as string & tags.Format<"uuid">,
      evaluation_cycle_id: comment.evaluation_cycle_id as string &
        tags.Format<"uuid">,
      comment: comment.comment,
    })),
  };
}
