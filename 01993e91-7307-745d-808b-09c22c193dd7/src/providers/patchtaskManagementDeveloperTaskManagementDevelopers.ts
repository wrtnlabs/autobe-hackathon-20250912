import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import { IPageITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementDeveloper";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Search and retrieve a filtered, paginated list of developers
 *
 * This operation supports searching developers by email and name substring,
 * paginating results, and sorting by email or name in ascending or descending
 * order. Only active developers (not soft-deleted) are included.
 *
 * @param props - Object containing authenticated developer and search
 *   parameters
 * @param props.developer - Authenticated developer payload with ID and type
 * @param props.body - Search criteria and pagination parameters
 * @returns Paginated list of developer summaries matching criteria
 * @throws {Error} When database operation fails
 */
export async function patchtaskManagementDeveloperTaskManagementDevelopers(props: {
  developer: DeveloperPayload;
  body: ITaskManagementDeveloper.IRequest;
}): Promise<IPageITaskManagementDeveloper.ISummary> {
  const { body } = props;

  // Normalize paging parameters with defaults
  const page = body.page ?? 0;
  const limit = body.limit ?? 10;

  // Validate and build where clause
  const where: {
    deleted_at: null;
    email?: string;
    name?: { contains: string };
  } = {
    deleted_at: null,
  };

  if (body.email !== undefined && body.email !== null) {
    where.email = body.email;
  }

  if (body.name !== undefined && body.name !== null) {
    where.name = { contains: body.name };
  }

  // Validate sort field and order
  const validSortFields = ["email", "name"] as const;
  const validOrderTypes = ["asc", "desc"] as const;
  const sort = validSortFields.includes(body.sort ?? null)
    ? body.sort!
    : "email";
  const order = validOrderTypes.includes(body.order ?? null)
    ? body.order!
    : "asc";

  // Construct orderBy inline
  const orderBy = {
    [sort]: order,
  } as {
    [key in (typeof validSortFields)[number]]: (typeof validOrderTypes)[number];
  };

  // Fetch data and count in parallel
  const [developers, total] = await Promise.all([
    MyGlobal.prisma.task_management_developer.findMany({
      where,
      orderBy,
      select: { id: true, email: true, name: true },
      skip: page * limit,
      take: limit,
    }),
    MyGlobal.prisma.task_management_developer.count({
      where,
    }),
  ]);

  // Map developers to summaries with correct typings
  const data: ITaskManagementDeveloper.ISummary[] = developers.map((dev) => ({
    id: dev.id,
    email: dev.email,
    name: dev.name,
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
