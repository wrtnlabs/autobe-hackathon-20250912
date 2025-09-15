import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRecipeCategoriesConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipeCategoriesConfig";
import { IPageIRecipeSharingRecipeCategoriesConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingRecipeCategoriesConfig";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchrecipeSharingModeratorRecipeCategoriesConfig(props: {
  moderator: ModeratorPayload;
  body: IRecipeSharingRecipeCategoriesConfig.IRequest;
}): Promise<IPageIRecipeSharingRecipeCategoriesConfig.ISummary> {
  const { moderator, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (body.code !== undefined && body.code !== null) {
    where.code = { contains: body.code };
  }
  if (body.name !== undefined && body.name !== null) {
    where.name = { contains: body.name };
  }

  const validSortFields = new Set([
    "id",
    "code",
    "name",
    "created_at",
    "updated_at",
  ]);
  const sortField = validSortFields.has(body.sort ?? "")
    ? body.sort!
    : "created_at";
  const sortDirection = body.direction === "asc" ? "asc" : "desc";

  const [results, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_recipe_categories_config.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortField]: sortDirection },
    }),
    MyGlobal.prisma.recipe_sharing_recipe_categories_config.count({ where }),
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
    })),
  };
}
