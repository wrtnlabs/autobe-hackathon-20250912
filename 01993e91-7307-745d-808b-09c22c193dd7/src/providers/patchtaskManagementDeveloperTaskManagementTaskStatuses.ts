import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatuses";
import { IPageITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskStatuses";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Search and retrieve list of taskManagementTaskStatuses
 *
 * Retrieves filtered and paginated task status summaries for task workflow
 * management. Supports searching by code and name with pagination and sorting.
 * Accessible by authenticated developers.
 *
 * @param props - Object containing developer authentication and request body
 *   with filters
 * @param props.developer - Authenticated developer executing the request
 * @param props.body - Filtering and pagination request parameters
 * @returns Paginated summary list matching criteria
 * @throws {Error} When unexpected errors occur during database access
 */
export async function patchtaskManagementDeveloperTaskManagementTaskStatuses(props: {
  developer: DeveloperPayload;
  body: ITaskManagementTaskStatuses.IRequest;
}): Promise<IPageITaskManagementTaskStatuses.ISummary> {
  const { developer, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  // Build where condition with safe checks for nullable filters
  const whereCondition = {
    ...(body.code !== undefined &&
      body.code !== null && { code: { contains: body.code } }),
    ...(body.name !== undefined &&
      body.name !== null && { name: { contains: body.name } }),
  };

  // Parse orderBy string into object
  const orderBy = (() => {
    if (!body.orderBy) return { created_at: "desc" };
    const [field, direction] = body.orderBy.split("_");
    if (!field) return { created_at: "desc" };
    const dir = direction === "ASC" ? "asc" : "desc";
    // Whitelist fields allowed for sorting
    const allowedFields = ["code", "name", "created_at", "updated_at"];
    if (!allowedFields.includes(field)) return { created_at: "desc" };
    return { [field]: dir };
  })();

  // Execute the query and count in parallel
  const [results, total] = await Promise.all([
    MyGlobal.prisma.task_management_task_statuses.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
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
    data: results.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      code: item.code,
      name: item.name,
      description: item.description ?? null,
    })),
  };
}
