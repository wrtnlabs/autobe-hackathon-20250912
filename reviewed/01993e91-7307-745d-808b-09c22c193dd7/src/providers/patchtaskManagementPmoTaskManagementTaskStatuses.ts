import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatuses";
import { IPageITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskStatuses";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Search and retrieve list of taskManagementTaskStatuses
 *
 * This endpoint allows an authenticated PMO to retrieve a filtered, sorted, and
 * paginated list of task statuses. Filters by optional code and name. Results
 * are sorted by code or name ascending/descending.
 *
 * @param props - Object containing PMO authentication and request body
 * @param props.pmo - Authenticated PMO payload
 * @param props.body - Request body containing filters and pagination options
 * @returns Paginated summary list of task statuses matching criteria
 * @throws {Error} When database operations fail or arguments are invalid
 */
export async function patchtaskManagementPmoTaskManagementTaskStatuses(props: {
  pmo: PmoPayload;
  body: ITaskManagementTaskStatuses.IRequest;
}): Promise<IPageITaskManagementTaskStatuses.ISummary> {
  const { pmo, body } = props;

  const page =
    body.page === undefined || body.page === null || body.page < 1
      ? 1
      : body.page;
  const limit =
    body.limit === undefined || body.limit === null || body.limit < 1
      ? 10
      : body.limit;

  const orderByRaw = body.orderBy ?? "code";

  let orderField: "code" | "name" = "code";
  let orderDirection: "asc" | "desc" = "asc";

  if (orderByRaw.startsWith("-")) {
    orderField = orderByRaw.slice(1) === "name" ? "name" : "code";
    orderDirection = "desc";
  } else if (orderByRaw === "name") {
    orderField = "name";
    orderDirection = "asc";
  }

  const whereCondition = {
    ...(body.code !== undefined &&
      body.code !== null && { code: { contains: body.code } }),
    ...(body.name !== undefined &&
      body.name !== null && { name: { contains: body.name } }),
  };

  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    MyGlobal.prisma.task_management_task_statuses.findMany({
      where: whereCondition,
      orderBy: { [orderField]: orderDirection },
      skip,
      take: limit,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.task_management_task_statuses.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description ?? null,
    })),
  };
}
