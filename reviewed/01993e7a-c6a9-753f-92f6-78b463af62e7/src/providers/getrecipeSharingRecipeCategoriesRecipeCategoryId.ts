import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRecipeCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipeCategory";

/**
 * Retrieve details of a specific recipe category by ID.
 *
 * This operation returns full details of the specified recipe category,
 * including the category type, name, description, and audit timestamps.
 *
 * @param props - Object containing the recipeCategoryId.
 * @param props.recipeCategoryId - Unique identifier of the recipe category.
 * @returns Detailed information of the requested recipe category.
 * @throws {Error} Throws if the recipe category with the given ID does not
 *   exist.
 */
export async function getrecipeSharingRecipeCategoriesRecipeCategoryId(props: {
  recipeCategoryId: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingRecipeCategory> {
  const { recipeCategoryId } = props;

  const record =
    await MyGlobal.prisma.recipe_sharing_recipe_categories.findUniqueOrThrow({
      where: { id: recipeCategoryId },
      select: {
        id: true,
        category_type: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    });

  return {
    id: record.id,
    category_type: record.category_type,
    name: record.name,
    description: record.description ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
