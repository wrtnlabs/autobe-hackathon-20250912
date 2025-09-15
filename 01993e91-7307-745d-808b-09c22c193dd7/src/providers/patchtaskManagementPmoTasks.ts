import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTasks";
import { IPageITaskManagementTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTasks";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Retrieves a paginated and filtered list of task summaries for PMO users.
 *
 * Supports filtering by status, priority, creator, project, board, and search
 * keyword. Pagination and sorting are supported to efficiently manage large
 * datasets.
 *
 * Authorization: Requires a valid PMO user payload with access to the task
 * listings.
 *
 * @param props - Object containing authenticated PMO user info and filter
 *   criteria
 * @param props.pmo - Authenticated PMO user payload
 * @param props.body - Task filtering and pagination parameters
 * @returns Paginated summary list of tasks
 * @throws Error when database operations fail
 */
export async function patchtaskManagementPmoTasks(props: {
  pmo: PmoPayload;
  body: ITaskManagementTasks.IRequest;
}): Promise<IPageITaskManagementTasks.ISummary> {
  const { pmo, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  const where: {
    deleted_at: null;
    status_id?: string & tags.Format<"uuid">;
    priority_id?: string & tags.Format<"uuid">;
    creator_id?: string & tags.Format<"uuid">;
    project_id?: string & tags.Format<"uuid">;
    board_id?: string & tags.Format<"uuid">;
    title?: { contains: string };
  } = { deleted_at: null };

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
  if (body.search !== undefined && body.search !== null && body.search !== "") {
    where.title = { contains: body.search };
  }

  const validSortFields = ["title", "created_at", "due_date"];
  const sortBy = validSortFields.includes(body.sort_by ?? "")
    ? body.sort_by!
    : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  const [results, total] = await Promise.all([
    MyGlobal.prisma.task_management_tasks.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        status_name: true,
        priority_name: true,
        due_date: true,
      },
    }),
    MyGlobal.prisma.task_management_tasks.count({ where }),
  ]);

  const data = results.map((task) => ({
    id: task.id,
    title: task.title,
    status_name: task.status_name ?? undefined,
    priority_name: task.priority_name ?? undefined,
    due_date: task.due_date ? toISOStringSafe(task.due_date) : undefined,
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
