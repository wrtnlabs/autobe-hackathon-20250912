import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementPriorities } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPriorities";
import { IPageITaskManagementPriorities } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementPriorities";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Search and list task priorities with pagination from
 * task_management_priorities table
 *
 * Retrieves a filtered and paginated list of task priority entities. Allows
 * filtering by search string on 'code' or 'name', sorting by 'name' or 'code',
 * and pagination.
 *
 * Access restricted to authenticated PMO users via the 'pmo' payload.
 *
 * @param props - Object containing authenticated PMO user and request body
 * @param props.pmo - Authenticated PMO user payload
 * @param props.body - Request body with filtering, pagination, and sorting
 *   options
 * @returns Paginated list of task priority summaries conforming to
 *   IPageITaskManagementPriorities.ISummary
 * @throws Error if any internal database operation fails
 */
export async function patchtaskManagementPmoTaskManagementPriorities(props: {
  pmo: PmoPayload;
  body: ITaskManagementPriorities.IRequest;
}): Promise<IPageITaskManagementPriorities.ISummary> {
  const { body } = props;

  // Define pagination parameters with defaults
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const skip = (page - 1) * limit;

  // Construct where clause for search filtering
  const whereCondition = {
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { code: { contains: body.search } },
          { name: { contains: body.search } },
        ],
      }),
  };

  // Determine orderBy clause
  const orderByClause =
    body.orderBy === "name" || body.orderBy === "code"
      ? { [body.orderBy]: body.orderDirection === "asc" ? "asc" : "desc" }
      : { created_at: "desc" };

  // Fetch paginated data and total count concurrently
  const [results, total] = await Promise.all([
    MyGlobal.prisma.task_management_priorities.findMany({
      where: whereCondition,
      orderBy: orderByClause,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.task_management_priorities.count({
      where: whereCondition,
    }),
  ]);

  // Return paginated results conforming to the ISummary type
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      code: item.code,
      name: item.name,
    })),
  };
}
