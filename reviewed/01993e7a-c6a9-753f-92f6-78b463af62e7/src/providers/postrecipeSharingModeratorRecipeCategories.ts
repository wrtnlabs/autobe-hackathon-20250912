import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingRecipeCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipeCategory";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Create a new recipe category in the system.
 *
 * This endpoint allows an authenticated moderator to create a new recipe
 * category with a unique combination of category type and name.
 *
 * The system validates uniqueness and returns the created entity.
 *
 * @param props - The request properties containing the moderator payload and
 *   the request body with category creation information.
 * @param props.moderator - The authenticated moderator user performing the
 *   creation.
 * @param props.body - The request body containing category_type, name, and
 *   optional description.
 * @returns The newly created recipe category with all audit timestamps.
 * @throws {Error} When a recipe category with the same type and name already
 *   exists.
 */
export async function postrecipeSharingModeratorRecipeCategories(props: {
  moderator: ModeratorPayload;
  body: IRecipeSharingRecipeCategory.ICreate;
}): Promise<IRecipeSharingRecipeCategory> {
  const { moderator, body } = props;

  // Check for existing identical category
  const existing =
    await MyGlobal.prisma.recipe_sharing_recipe_categories.findFirst({
      where: {
        category_type: body.category_type,
        name: body.name,
      },
    });

  if (existing !== null) {
    throw new Error("Recipe category name already exists for this type");
  }

  // Generate new UUID and timestamps
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Create new category record
  const created = await MyGlobal.prisma.recipe_sharing_recipe_categories.create(
    {
      data: {
        id,
        category_type: body.category_type,
        name: body.name,
        description: body.description ?? null,
        created_at: now,
        updated_at: now,
      },
    },
  );

  // Return the created category
  return {
    id: created.id,
    category_type: created.category_type,
    name: created.name,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
