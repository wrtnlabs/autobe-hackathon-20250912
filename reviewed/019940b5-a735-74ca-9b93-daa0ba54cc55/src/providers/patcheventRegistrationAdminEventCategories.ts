import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEventCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCategory";
import { IPageIEventRegistrationEventCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve a paginated list of event categories.
 *
 * Allows filtering by name, description, and timestamps. Supports sorting and
 * pagination, and is restricted to admins.
 *
 * @param props - Object containing authenticated admin info and filter params
 * @param props.admin - AdminPayload providing auth context
 * @param props.body - Filter and pagination request params
 * @returns Paginated summary of event categories
 * @throws {Error} Throws if database query fails
 */
export async function patcheventRegistrationAdminEventCategories(props: {
  admin: AdminPayload;
  body: IEventRegistrationEventCategory.IRequest;
}): Promise<IPageIEventRegistrationEventCategory.ISummary> {
  const { admin, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 100) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  const where = {
    ...(body.name !== undefined &&
      body.name !== null && { name: { contains: body.name } }),
    ...(body.description !== undefined &&
      body.description !== null && {
        description: { contains: body.description },
      }),
    ...(body.created_at !== undefined &&
      body.created_at !== null && { created_at: body.created_at }),
    ...(body.updated_at !== undefined &&
      body.updated_at !== null && { updated_at: body.updated_at }),
    ...(body.deleted_at !== undefined &&
      body.deleted_at !== null && { deleted_at: body.deleted_at }),
  };

  const sortBy = body.sortBy ?? "created_at";
  const sortDirection = body.sortDirection ?? "desc";
  const orderBy = { [sortBy]: sortDirection };

  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    MyGlobal.prisma.event_registration_event_categories.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.event_registration_event_categories.count({ where }),
  ]);

  const data = results.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description ?? null,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
