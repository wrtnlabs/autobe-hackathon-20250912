import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRecipeCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipeCategory";
import { IPageIRecipeSharingRecipeCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingRecipeCategory";

/**
 * Retrieves a filtered and paginated list of recipe categories from the system.
 *
 * Supports pagination, filtering by category type and partial name match.
 * Excludes soft deleted categories.
 *
 * @param props - Object containing the request body with search criteria and
 *   pagination info
 * @returns A paginated list of recipe category summaries
 * @throws {Error} Throws if an unexpected database or Prisma error occurs
 */
export async function patchrecipeSharingRecipeCategories(props: {
  body: IRecipeSharingRecipeCategory.IRequest;
}): Promise<IPageIRecipeSharingRecipeCategory.ISummary> {
  const { body } = props;

  // Set pagination defaults if not provided or null
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;

  // Calculate offset for Prisma skip
  const skip = (page - 1) * limit;

  // Build filtered query conditions
  const where = {
    deleted_at: null,
    ...(body.category_type !== undefined &&
      body.category_type !== null && {
        category_type: body.category_type,
      }),
    ...(body.name !== undefined &&
      body.name !== null && {
        name: { contains: body.name },
      }),
  };

  // Query for filtered categories and count total
  const [results, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_recipe_categories.findMany({
      where,
      orderBy: { updated_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.recipe_sharing_recipe_categories.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      category_type: item.category_type,
      name: item.name,
      description: item.description ?? undefined,
    })),
  };
}
