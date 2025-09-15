import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalTaskActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskActivity";
import { IPageIJobPerformanceEvalTaskActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalTaskActivity";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Retrieve a paginated and filtered list of task activities associated with the
 * specified task.
 *
 * Only authenticated employees can access this endpoint.
 *
 * @param props - An object containing employee authentication payload, task ID,
 *   and filtering/pagination criteria.
 * @param props.employee - Authenticated employee payload with user ID and type.
 * @param props.taskId - UUID of the task to fetch activities for.
 * @param props.body - Request body with filters, pagination, and orderBy
 *   options.
 * @returns A paginated summary list of task activities matching the criteria.
 * @throws {Error} Throws if any database or unexpected error occurs.
 */
export async function patchjobPerformanceEvalEmployeeTasksTaskIdTaskActivities(props: {
  employee: EmployeePayload;
  taskId: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalTaskActivity.IRequest;
}): Promise<IPageIJobPerformanceEvalTaskActivity.ISummary> {
  const { employee, taskId, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  const where = {
    deleted_at: null,
    task_id: taskId,
  } as const;

  // Build dynamic where with optional search filter
  const searchFilter =
    body.search !== undefined && body.search !== null ? body.search : null;

  const finalWhere =
    searchFilter !== null
      ? {
          ...where,
          OR: [
            { code: { contains: searchFilter } },
            { name: { contains: searchFilter } },
          ],
        }
      : where;

  // Parse orderBy string safely
  let orderBy: { [key: string]: "asc" | "desc" } = { created_at: "desc" };
  if (body.orderBy !== undefined && body.orderBy !== null) {
    const match = body.orderBy.match(/^(name|created_at)_(ASC|DESC)$/);
    if (match) {
      const field = match[1];
      const direction = match[2].toLowerCase() as "asc" | "desc";
      orderBy = { [field]: direction };
    }
  }

  const [total, results] = await Promise.all([
    MyGlobal.prisma.job_performance_eval_task_activities.count({
      where: finalWhere,
    }),
    MyGlobal.prisma.job_performance_eval_task_activities.findMany({
      where: finalWhere,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        created_at: true,
      },
    }),
  ]);

  const data = results.map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    description: item.description ?? undefined,
    created_at: toISOStringSafe(item.created_at),
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
