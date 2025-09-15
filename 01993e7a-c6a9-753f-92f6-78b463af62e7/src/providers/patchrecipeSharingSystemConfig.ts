import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingSystemConfig";
import { IPageIRecipeSharingSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingSystemConfig";

/**
 * Retrieve a paginated list of system configuration entries matching the
 * provided search criteria.
 *
 * This operation accepts pagination parameters such as page number and size,
 * sorting options including ascending or descending, and filters by keys or
 * values.
 *
 * This is a public endpoint that requires no authentication.
 *
 * @param props - The request properties containing the filter and pagination
 *   options.
 * @param props.body - The request body with search criteria and paging
 *   settings.
 * @returns A paginated list of system configuration entries matching the
 *   filters.
 * @throws {Error} Propagates any database or unexpected errors encountered.
 */
export async function patchrecipeSharingSystemConfig(props: {
  body: IRecipeSharingSystemConfig.IRequest;
}): Promise<IPageIRecipeSharingSystemConfig> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  let orderField = "created_at";
  let orderDirection: "asc" | "desc" = "desc";

  if (body.order_by) {
    const parts = body.order_by.trim().split(" ");
    if (
      parts.length === 2 &&
      [
        "id",
        "key",
        "value",
        "description",
        "created_at",
        "updated_at",
      ].includes(parts[0]) &&
      ["asc", "desc"].includes(parts[1].toLowerCase())
    ) {
      orderField = parts[0];
      orderDirection = parts[1].toLowerCase() as "asc" | "desc";
    }
  }

  const where: {
    key?: { contains: string };
    value?: { contains: string };
  } = {};

  if (body.key !== undefined && body.key !== null) {
    where.key = { contains: body.key };
  }
  if (body.value !== undefined && body.value !== null) {
    where.value = { contains: body.value };
  }

  const [total, results] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_system_config.count({ where }),
    MyGlobal.prisma.recipe_sharing_system_config.findMany({
      where,
      orderBy: { [orderField]: orderDirection },
      skip,
      take: limit,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    },
    data: results.map((item) => ({
      id: item.id,
      key: item.key,
      value: item.value,
      description: item.description === null ? null : item.description,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
