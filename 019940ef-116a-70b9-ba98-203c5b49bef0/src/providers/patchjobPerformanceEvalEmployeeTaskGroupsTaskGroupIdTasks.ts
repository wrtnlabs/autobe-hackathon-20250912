import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTask";
import { IPageIJobPerformanceEvalTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalTask";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Search and retrieve paginated list of tasks within a task group.
 *
 * This endpoint allows authorized employees to query the task list with
 * filters, sorting, and pagination controls. Only active tasks are shown.
 *
 * @param props - Request properties
 * @param props.employee - The authenticated employee making the request
 * @param props.taskGroupId - UUID of the task group to filter tasks
 * @param props.body - Search, filter, and pagination criteria
 * @returns Paginated list of matching tasks
 * @throws {Error} If any unexpected error occurs during database operations
 */
export async function patchjobPerformanceEvalEmployeeTaskGroupsTaskGroupIdTasks(props: {
  employee: EmployeePayload;
  taskGroupId: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalTask.IRequest;
}): Promise<IPageIJobPerformanceEvalTask> {
  const { employee, taskGroupId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 100) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const whereConditions: {
    task_group_id: string & tags.Format<"uuid">;
    deleted_at: null;
    knowledge_area_id?: string & tags.Format<"uuid">;
    OR?: { code: { contains: string }; name: { contains: string } }[];
  } = {
    task_group_id: taskGroupId,
    deleted_at: null,
  };

  if (body.knowledge_area_id !== undefined && body.knowledge_area_id !== null) {
    whereConditions.knowledge_area_id = body.knowledge_area_id;
  }

  if (body.search !== undefined && body.search !== null) {
    whereConditions.OR = [
      { code: { contains: body.search } },
      { name: { contains: body.search } },
    ];
  }

  const allowedSortFields = ["code", "name", "created_at", "updated_at"];
  const sortField = body.sort ?? "created_at";
  const sortDirection = body.direction === "asc" ? "asc" : "desc";
  const orderByField = allowedSortFields.includes(sortField)
    ? sortField
    : "created_at";

  const [tasks, total] = await Promise.all([
    MyGlobal.prisma.job_performance_eval_tasks.findMany({
      where: whereConditions,
      orderBy: { [orderByField]: sortDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.job_performance_eval_tasks.count({
      where: whereConditions,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: tasks.map((task) => ({
      id: task.id,
      task_group_id: task.task_group_id,
      code: task.code,
      name: task.name,
      description: task.description ?? null,
      knowledge_area_id: task.knowledge_area_id ?? null,
      created_at: toISOStringSafe(task.created_at),
      updated_at: toISOStringSafe(task.updated_at),
      deleted_at: task.deleted_at ? toISOStringSafe(task.deleted_at) : null,
    })),
  };
}
