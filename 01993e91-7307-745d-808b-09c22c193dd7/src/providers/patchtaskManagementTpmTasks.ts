import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTasks";
import { IPageITaskManagementTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTasks";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Retrieves a paginated and filtered list of tasks from the
 * task_management_tasks table.
 *
 * This function supports advanced search criteria, sorting, and pagination. It
 * returns task summaries with essential details optimized for list rendering.
 *
 * @param props - Object containing the authenticated TPM user and request
 *   filters.
 * @param props.tpm - Authenticated TPM user payload.
 * @param props.body - Search, pagination, and sorting parameters for tasks.
 * @returns Paginated summary list of tasks matching the filter criteria.
 * @throws {Error} Throws error if any database operation fails.
 */
export async function patchtaskManagementTpmTasks(props: {
  tpm: TpmPayload;
  body: ITaskManagementTasks.IRequest;
}): Promise<IPageITaskManagementTasks.ISummary> {
  const { tpm, body } = props;

  // Default pagination values
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build Prisma where condition based on provided filters
  const whereCondition = {
    deleted_at: null as null,
    ...(body.status_id !== undefined &&
      body.status_id !== null && { status_id: body.status_id }),
    ...(body.priority_id !== undefined &&
      body.priority_id !== null && { priority_id: body.priority_id }),
    ...(body.creator_id !== undefined &&
      body.creator_id !== null && { creator_id: body.creator_id }),
    ...(body.project_id !== undefined &&
      body.project_id !== null && { project_id: body.project_id }),
    ...(body.board_id !== undefined &&
      body.board_id !== null && { board_id: body.board_id }),
    ...(body.search !== undefined &&
      body.search !== null && { title: { contains: body.search } }),
  };

  // Execute queries concurrently for task list and total count
  const [tasks, total] = await Promise.all([
    MyGlobal.prisma.task_management_tasks.findMany({
      where: whereCondition,
      orderBy: { [body.sort_by ?? "created_at"]: body.sort_order ?? "desc" },
      skip: skip,
      take: limit,
      select: {
        id: true,
        title: true,
        status_name: true,
        priority_name: true,
        due_date: true,
      },
    }),
    MyGlobal.prisma.task_management_tasks.count({ where: whereCondition }),
  ]);

  // Format tasks data to conform to the response interface
  const data = tasks.map((task) => ({
    id: task.id as string & tags.Format<"uuid">,
    title: task.title,
    status_name: task.status_name ?? undefined,
    priority_name: task.priority_name ?? undefined,
    due_date: task.due_date ? toISOStringSafe(task.due_date) : undefined,
  }));

  // Return paginated response
  return {
    pagination: {
      current: Number(page) as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: Number(limit) as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
