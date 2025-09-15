import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatuses";
import { IPageITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskStatuses";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Search and retrieve list of taskManagementTaskStatuses
 *
 * Retrieves a paginated list of taskManagementTaskStatuses from the database,
 * supporting optional filtering by code and name, with pagination and ordering
 * support.
 *
 * Accessible to authenticated designers.
 *
 * @param props - The request properties containing authentication and filters
 * @param props.designer - Authenticated designer payload
 * @param props.body - Filter and pagination criteria
 * @returns Paginated summary list of taskManagementTaskStatuses
 * @throws {Error} When database operation fails or parameters are invalid
 */
export async function patchtaskManagementDesignerTaskManagementTaskStatuses(props: {
  designer: DesignerPayload;
  body: ITaskManagementTaskStatuses.IRequest;
}): Promise<IPageITaskManagementTaskStatuses.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build Prisma where condition
  const where = {
    ...(body.code !== undefined &&
      body.code !== null && { code: { contains: body.code } }),
    ...(body.name !== undefined &&
      body.name !== null && { name: { contains: body.name } }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.task_management_task_statuses.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: { id: true, code: true, name: true, description: true },
    }),
    MyGlobal.prisma.task_management_task_statuses.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description ?? null,
    })),
  };
}
