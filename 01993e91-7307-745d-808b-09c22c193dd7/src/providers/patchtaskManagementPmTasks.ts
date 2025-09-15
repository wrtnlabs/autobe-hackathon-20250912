import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTasks";
import { IPageITaskManagementTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTasks";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Retrieves a paginated and filtered list of task summaries for PM users.
 *
 * This operation supports complex filtering options such as status, priority,
 * creator, project, board, and title keyword search. It also allows sorting by
 * several fields and pagination control.
 *
 * @param props - Object containing authenticated PM user payload and request
 *   body with filters and pagination
 * @param props.pm - Authenticated Project Manager user
 * @param props.body - Request body conforming to ITaskManagementTasks.IRequest
 *   containing filters and pagination options
 * @returns Promise resolving to a paginated summary list of tasks matching
 *   criteria
 * @throws Will throw errors if database operations fail or invalid parameters
 *   are provided
 */
export async function patchtaskManagementPmTasks(props: {
  pm: PmPayload;
  body: ITaskManagementTasks.IRequest;
}): Promise<IPageITaskManagementTasks.ISummary> {
  const { pm, body } = props;

  // Pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Construct where condition with null and undefined checks
  const where: {
    status_id?: string;
    priority_id?: string;
    creator_id?: string;
    project_id?: string;
    board_id?: string;
    title?: { contains: string };
  } = {};

  if (body.status_id !== undefined && body.status_id !== null) {
    where.status_id = body.status_id;
  }
  if (body.priority_id !== undefined && body.priority_id !== null) {
    where.priority_id = body.priority_id;
  }
  if (body.creator_id !== undefined && body.creator_id !== null) {
    where.creator_id = body.creator_id;
  }
  if (body.project_id !== undefined && body.project_id !== null) {
    where.project_id = body.project_id;
  }
  if (body.board_id !== undefined && body.board_id !== null) {
    where.board_id = body.board_id;
  }
  if (body.search !== undefined && body.search !== null) {
    where.title = { contains: body.search };
  }

  // Valid sort fields
  const allowedSortFields = [
    "id",
    "title",
    "created_at",
    "updated_at",
    "due_date",
  ];
  const sortBy =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortOrder =
    body.sort_order === "asc" || body.sort_order === "desc"
      ? body.sort_order
      : "desc";

  // Fetch total count and paginated tasks in parallel
  const [total, tasks] = await Promise.all([
    MyGlobal.prisma.task_management_tasks.count({ where }),
    MyGlobal.prisma.task_management_tasks.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        title: true,
        status_name: true,
        priority_name: true,
        due_date: true,
      },
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
      title: task.title,
      status_name: task.status_name ?? null,
      priority_name: task.priority_name ?? null,
      due_date: task.due_date ? toISOStringSafe(task.due_date) : null,
    })),
  };
}
