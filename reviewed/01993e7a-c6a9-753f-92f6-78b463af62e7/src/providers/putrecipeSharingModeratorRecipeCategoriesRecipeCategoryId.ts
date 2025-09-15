import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRecipeCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipeCategory";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Update an existing recipe category by ID.
 *
 * This function allows a moderator to update fields in a recipe category
 * identified by its UUID. It ensures the category exists and applies changes to
 * category_type, name, and description as provided.
 *
 * Dates are managed as ISO8601 strings with appropriate DTO compliance.
 *
 * @param props - Object containing moderator authentication, the recipe
 *   category ID, and the update payload
 * @param props.moderator - Authenticated moderator payload
 * @param props.recipeCategoryId - UUID of the recipe category to update
 * @param props.body - Partial data for category update
 * @returns The updated recipe category with all fields
 * @throws {Error} If the recipe category does not exist
 */
export async function putrecipeSharingModeratorRecipeCategoriesRecipeCategoryId(props: {
  moderator: ModeratorPayload;
  recipeCategoryId: string & tags.Format<"uuid">;
  body: IRecipeSharingRecipeCategory.IUpdate;
}): Promise<IRecipeSharingRecipeCategory> {
  const { moderator, recipeCategoryId, body } = props;

  // Check if the recipe category exists and is not soft-deleted
  const existing =
    await MyGlobal.prisma.recipe_sharing_recipe_categories.findFirst({
      where: {
        id: recipeCategoryId,
        deleted_at: null,
      },
    });

  if (!existing) {
    throw new Error("Recipe category not found");
  }

  // Perform the update
  const updated = await MyGlobal.prisma.recipe_sharing_recipe_categories.update(
    {
      where: { id: recipeCategoryId },
      data: {
        category_type:
          body.category_type === null
            ? null
            : (body.category_type ?? undefined),
        name: body.name === null ? null : (body.name ?? undefined),
        description:
          body.description === null ? null : (body.description ?? undefined),
        updated_at: toISOStringSafe(new Date()),
      },
    },
  );

  return {
    id: updated.id,
    category_type: updated.category_type,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
