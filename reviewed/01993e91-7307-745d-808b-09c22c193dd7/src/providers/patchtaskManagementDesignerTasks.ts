import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTasks";
import { IPageITaskManagementTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTasks";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

export async function patchtaskManagementDesignerTasks(props: {
  designer: DesignerPayload;
  body: ITaskManagementTasks.IRequest;
}): Promise<IPageITaskManagementTasks.ISummary> {
  const { designer, body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
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

  const orderBy =
    body.sort_by && body.sort_order
      ? { [body.sort_by]: body.sort_order }
      : { created_at: "desc" };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.task_management_tasks.findMany({
      where,
      orderBy,
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
    data: results.map((task) => ({
      id: task.id,
      title: task.title,
      status_name: task.status_name ?? null,
      priority_name: task.priority_name ?? null,
      due_date: task.due_date ? toISOStringSafe(task.due_date) : null,
    })),
  };
}
