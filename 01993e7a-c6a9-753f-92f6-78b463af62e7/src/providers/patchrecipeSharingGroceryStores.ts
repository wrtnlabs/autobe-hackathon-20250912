import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingGroceryStore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingGroceryStore";
import { IPageIRecipeSharingGroceryStore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingGroceryStore";

/**
 * Retrieves a paginated list of grocery stores for shopping list integrations.
 *
 * Supports pagination, filtering by store name, and sorting by name or creation
 * date. This is a public endpoint, accessible without authentication.
 *
 * @param props - Object containing request body with pagination, search, and
 *   sort criteria
 * @param props.body - Request body following
 *   IRecipeSharingGroceryStore.IRequest
 * @returns Paginated summary list of grocery stores including uuid and name
 * @throws {Error} Throws error if database operation fails
 */
export async function patchrecipeSharingGroceryStores(props: {
  body: IRecipeSharingGroceryStore.IRequest;
}): Promise<IPageIRecipeSharingGroceryStore.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where condition with optional search on name
  const whereCondition = {
    ...(props.body.search !== undefined &&
      props.body.search !== null && {
        name: { contains: props.body.search },
      }),
  };

  // Default order by created_at descending
  let orderByCondition = { created_at: "desc" } as const;

  if (props.body.sort !== undefined && props.body.sort !== null) {
    const [field, dir] = props.body.sort.split("|");
    if (
      (field === "name" || field === "created_at") &&
      (dir === "asc" || dir === "desc")
    ) {
      orderByCondition = { [field]: dir } as const;
    }
  }

  // Fetch results and total count concurrently
  const [results, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_grocery_stores.findMany({
      where: whereCondition,
      orderBy: orderByCondition,
      skip: skip,
      take: limit,
      select: {
        id: true,
        name: true,
      },
    }),
    MyGlobal.prisma.recipe_sharing_grocery_stores.count({
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
    data: results.map((r) => ({
      id: r.id,
      name: r.name,
    })),
  };
}
