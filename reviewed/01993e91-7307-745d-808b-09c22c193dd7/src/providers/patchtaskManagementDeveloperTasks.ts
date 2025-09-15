import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTasks";
import { IPageITaskManagementTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTasks";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Retrieves a paginated list of task summaries filtered by optional search
 * criteria.
 *
 * This operation supports complex filtering, sorting, and pagination controls
 * to assist developers in finding tasks relevant to their role and
 * responsibilities.
 *
 * @param props - Object containing the authenticated developer and request
 *   filters
 * @param props.developer - Authenticated developer payload
 * @param props.body - Filtering, pagination, and sorting criteria conforming to
 *   ITaskManagementTasks.IRequest
 * @returns Paginated list of task summaries matching the filter criteria
 * @throws {Error} When database access fails or invalid parameters are provided
 */
export async function patchtaskManagementDeveloperTasks(props: {
  developer: DeveloperPayload;
  body: ITaskManagementTasks.IRequest;
}): Promise<IPageITaskManagementTasks.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 100) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.status_id !== undefined &&
      body.status_id !== null && {
        status_id: body.status_id,
      }),
    ...(body.priority_id !== undefined &&
      body.priority_id !== null && {
        priority_id: body.priority_id,
      }),
    ...(body.creator_id !== undefined &&
      body.creator_id !== null && {
        creator_id: body.creator_id,
      }),
    ...(body.project_id !== undefined &&
      body.project_id !== null && {
        project_id: body.project_id,
      }),
    ...(body.board_id !== undefined &&
      body.board_id !== null && {
        board_id: body.board_id,
      }),
    ...(body.search !== undefined &&
      body.search !== null && {
        title: { contains: body.search },
      }),
  };

  const orderBy = body.sort_by
    ? {
        [body.sort_by]: body.sort_order === "asc" ? "asc" : "desc",
      }
    : { created_at: "desc" };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.task_management_tasks.findMany({
      where,
      orderBy,
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
    MyGlobal.prisma.task_management_tasks.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      title: item.title,
      status_name: item.status_name ?? null,
      priority_name: item.priority_name ?? null,
      due_date: item.due_date ? toISOStringSafe(item.due_date) : null,
    })),
  };
}
