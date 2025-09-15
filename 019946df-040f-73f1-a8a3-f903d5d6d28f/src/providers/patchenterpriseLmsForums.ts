import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsForum } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForum";
import { IPageIEnterpriseLmsForum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsForum";

/**
 * Retrieve filtered list of forums
 *
 * This endpoint returns a paginated list of active forums, supports search
 * filter, pagination, and sorting.
 *
 * @param props - Object containing request body for filtering and pagination
 * @param props.body - Filter, search, sort, and pagination parameters
 * @returns Paginated forum summary list
 * @throws {Error} If an unexpected error occurs during database query
 */
export async function patchenterpriseLmsForums(props: {
  body: IEnterpriseLmsForum.IRequest;
}): Promise<IPageIEnterpriseLmsForum.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 100) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  const skip = (page - 1) * limit;

  // Build dynamic where condition
  const where = {
    deleted_at: null,
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { name: { contains: body.search } },
          { description: { contains: body.search } },
        ],
      }),
  };

  // Allowed sort fields
  const allowedSortFields = ["name", "created_at", "updated_at"];
  const sortField =
    body.sortField && allowedSortFields.includes(body.sortField)
      ? body.sortField
      : "created_at";

  const sortOrder = body.sortOrder === "desc" ? "desc" : "asc";

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_forums.findMany({
      where,
      select: { id: true, name: true, description: true },
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_forums.count({ where }),
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
      name: item.name,
      description: item.description ?? null,
    })),
  };
}
