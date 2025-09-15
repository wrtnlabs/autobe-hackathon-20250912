import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import { IPageITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementQa";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Retrieves paginated list of QA users filtered by email, name, created_at, and
 * updated_at.
 *
 * This function requires PM role authorization.
 *
 * @param props - Object containing PM payload and filter/pagination criteria.
 * @param props.pm - Authenticated PM user payload.
 * @param props.body - Filter, pagination, and sorting requests.
 * @returns Paginated QA summaries matching the filters.
 * @throws {Error} When database or query fails.
 */
export async function patchtaskManagementPmTaskManagementQas(props: {
  pm: PmPayload;
  body: ITaskManagementQa.IRequest;
}): Promise<IPageITaskManagementQa.ISummary> {
  const { body } = props;

  // Defaults for pagination
  const page = body.page ?? 0;
  const limit = body.limit ?? 10;

  // Build where conditions
  const where = {
    deleted_at: null,
    ...(body.email !== undefined &&
      body.email !== null && {
        email: { contains: body.email },
      }),
    ...(body.name !== undefined &&
      body.name !== null && {
        name: { contains: body.name },
      }),
    ...(body.created_at !== undefined &&
      body.created_at !== null && {
        created_at: { gte: body.created_at },
      }),
    ...(body.updated_at !== undefined &&
      body.updated_at !== null && {
        updated_at: { gte: body.updated_at },
      }),
  };

  // Determine orderBy
  const orderBy =
    body.sort === "email"
      ? { email: "asc" }
      : body.sort === "name"
        ? { name: "asc" }
        : body.sort === "created_at"
          ? { created_at: "asc" }
          : body.sort === "updated_at"
            ? { updated_at: "asc" }
            : { created_at: "desc" };

  // Query the data and count
  const [results, total] = await Promise.all([
    MyGlobal.prisma.task_management_qa.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
      },
      orderBy,
      skip: page * limit,
      take: limit,
    }),
    MyGlobal.prisma.task_management_qa.count({ where }),
  ]);

  // Prepare return
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      email: item.email,
      name: item.name,
    })),
  };
}
