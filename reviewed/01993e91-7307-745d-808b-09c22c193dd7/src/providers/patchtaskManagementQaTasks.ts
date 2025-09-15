import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTasks";
import { IPageITaskManagementTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTasks";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Retrieves a paginated and filtered list of tasks accessible to QA users.
 *
 * Supports complex filtering by status, priority, creator, project, board,
 * full-text search on titles, and sorting options. Pagination parameters
 * control the page size and current page.
 *
 * @param props - Object containing authentication and request body parameters
 * @param props.qa - Authenticated QA user payload
 * @param props.body - Request object conforming to
 *   ITaskManagementTasks.IRequest
 * @returns Paginated summary list of tasks matching filter criteria
 * @throws {Error} Throws if database operations encounter issues
 */
export async function patchtaskManagementQaTasks(props: {
  qa: QaPayload;
  body: ITaskManagementTasks.IRequest;
}): Promise<IPageITaskManagementTasks.ISummary> {
  const { qa, body } = props;
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 100) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.status_id !== undefined && body.status_id !== null
      ? { status_id: body.status_id }
      : {}),
    ...(body.priority_id !== undefined && body.priority_id !== null
      ? { priority_id: body.priority_id }
      : {}),
    ...(body.creator_id !== undefined && body.creator_id !== null
      ? { creator_id: body.creator_id }
      : {}),
    ...(body.project_id !== undefined && body.project_id !== null
      ? { project_id: body.project_id }
      : {}),
    ...(body.board_id !== undefined && body.board_id !== null
      ? { board_id: body.board_id }
      : {}),
  } as const;

  if (
    body.search !== undefined &&
    body.search !== null &&
    body.search.trim() !== ""
  ) {
    (where as any).title = { contains: body.search.trim() };
  }

  const sortBy =
    body.sort_by && typeof body.sort_by === "string"
      ? body.sort_by
      : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  const [tasks, total] = await Promise.all([
    MyGlobal.prisma.task_management_tasks.findMany({
      where,
      select: {
        id: true,
        title: true,
        status_name: true,
        priority_name: true,
        due_date: true,
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.task_management_tasks.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: tasks.map((task) => ({
      id: task.id as string & tags.Format<"uuid">,
      title: task.title,
      status_name: task.status_name ?? null,
      priority_name: task.priority_name ?? null,
      due_date: task.due_date ? toISOStringSafe(task.due_date) : null,
    })),
  };
}
