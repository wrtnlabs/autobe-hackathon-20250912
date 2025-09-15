import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalTaskActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskActivity";
import { IPageIJobPerformanceEvalTaskActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalTaskActivity";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Retrieve a paginated list of job performance evaluation task activities for a
 * specified task.
 *
 * Retrieves task activities associated with the specified taskId. Supports
 * search filtering by code or name, ordering, and pagination. Only accessible
 * to authenticated managers.
 *
 * @param props - The request parameters containing authentication info, task
 *   ID, and filter criteria.
 * @param props.manager - Authenticated manager user.
 * @param props.taskId - UUID of the parent task for which activities are
 *   retrieved.
 * @param props.body - Filtering and pagination criteria.
 * @returns Paginated summary list of task activities.
 * @throws {Error} If any database operation fails.
 */
export async function patchjobPerformanceEvalManagerTasksTaskIdTaskActivities(props: {
  manager: ManagerPayload;
  taskId: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalTaskActivity.IRequest;
}): Promise<IPageIJobPerformanceEvalTaskActivity.ISummary> {
  const { manager, taskId, body } = props;

  // Pagination parameters with safe defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Construct where condition
  const where = {
    deleted_at: null,
    task_id: taskId,
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { code: { contains: body.search } },
          { name: { contains: body.search } },
        ],
      }),
  };

  // Determine order by clause safely
  const orderBy = body.orderBy
    ? (() => {
        const order = body.orderBy!.endsWith("_DESC") ? "desc" : "asc";
        const field = body.orderBy!.replace(/_(ASC|DESC)$/, "");
        if (["code", "name", "created_at", "updated_at"].includes(field)) {
          return { [field]: order };
        }
        return { created_at: "desc" };
      })()
    : { created_at: "desc" };

  // Fetch filtered data and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.job_performance_eval_task_activities.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.job_performance_eval_task_activities.count({ where }),
  ]);

  // Prepare pagination info
  const pagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };

  // Map results to summary data
  const data = rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? undefined,
  }));

  return {
    pagination,
    data,
  };
}
