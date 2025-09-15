import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import { IPageITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementQa";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * List QA user accounts with filtering and pagination
 *
 * Retrieves a paginated list of Quality Assurance user summaries from the
 * task_management_qa table. Supports filtering by email, name, created_at, and
 * updated_at fields with optional substring matching. Pagination and sorting
 * parameters control the result set paging and ordering.
 *
 * @param props - Object containing PMO auth payload and request
 *   filters/pagination
 * @param props.pmo - Authenticated PMO user payload
 * @param props.body - Object with filter criteria and pagination options
 * @returns Paginated QA user summaries matching search criteria
 * @throws Error when unexpected issues occur during database query
 */
export async function patchtaskManagementPmoTaskManagementQas(props: {
  pmo: PmoPayload;
  body: ITaskManagementQa.IRequest;
}): Promise<IPageITaskManagementQa.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  const where = {
    deleted_at: null as null,
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
        created_at: body.created_at,
      }),
    ...(body.updated_at !== undefined &&
      body.updated_at !== null && {
        updated_at: body.updated_at,
      }),
  };

  const orderBy =
    body.sort === "email"
      ? { email: "asc" }
      : body.sort === "name"
        ? { name: "asc" }
        : body.sort === "updated_at"
          ? { updated_at: "desc" }
          : { created_at: "desc" }; // default sort descending by created_at

  const [results, total] = await Promise.all([
    MyGlobal.prisma.task_management_qa.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
      },
    }),
    MyGlobal.prisma.task_management_qa.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((qa) => ({
      id: qa.id,
      email: qa.email,
      name: qa.name,
    })),
  };
}
