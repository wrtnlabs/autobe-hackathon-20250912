import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingShoppingList } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingList";
import { IPageIRecipeSharingShoppingList } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingShoppingList";

/**
 * Search and retrieve paginated shopping lists.
 *
 * This endpoint retrieves shopping lists filtered by optional user ID and name
 * substring search. Results are paginated with page and limit parameters.
 *
 * No authentication is required.
 *
 * @param props - Object containing request body with search and pagination
 *   criteria
 * @param props.body - Search criteria including user_id, name, page, limit,
 *   sort
 * @returns Paginated summary list of shopping lists matching criteria
 * @throws {Error} If database operation fails
 */
export async function patchrecipeSharingShoppingLists(props: {
  body: IRecipeSharingShoppingList.IRequest;
}): Promise<IPageIRecipeSharingShoppingList.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const whereCondition = {
    deleted_at: null,
    ...(body.user_id !== undefined &&
      body.user_id !== null && { user_id: body.user_id }),
    ...(body.name !== undefined &&
      body.name !== null && { name: { contains: body.name } }),
  };

  const [items, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_shopping_lists.findMany({
      where: whereCondition,
      orderBy: body.sort === "name" ? { name: "asc" } : { created_at: "desc" },
      skip,
      take: limit,
      select: { id: true, name: true },
    }),
    MyGlobal.prisma.recipe_sharing_shopping_lists.count({
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
    data: items.map((item) => ({ id: item.id, name: item.name })),
  };
}
