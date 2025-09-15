import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingDietCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingDietCategory";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Updates an existing diet category by ID.
 *
 * This operation updates the code, name, and description of a diet category
 * identified by its unique ID. It enforces uniqueness of the code and ensures
 * the updated_at timestamp is refreshed.
 *
 * @param props - Properties including moderator authorization, the diet
 *   category ID, and the update body with optional fields.
 * @param props.moderator - The authenticated moderator performing the update.
 * @param props.id - UUID of the diet category to update.
 * @param props.body - Object containing optional code, name, and description
 *   fields to update.
 * @returns The updated diet category with all fields and ISO date-time strings.
 * @throws {Error} When the diet category with given ID does not exist.
 * @throws {Error} When the provided code conflicts with another existing
 *   category.
 */
export async function putrecipeSharingModeratorDietCategoriesId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
  body: IRecipeSharingDietCategory.IUpdate;
}): Promise<IRecipeSharingDietCategory> {
  const { moderator, id, body } = props;

  // Fetch existing diet category
  const existing =
    await MyGlobal.prisma.recipe_sharing_diet_categories.findUnique({
      where: { id },
    });

  if (!existing) {
    throw new Error(`Diet category with id ${id} not found`);
  }

  // Validate uniqueness for code if changed
  if (body.code !== undefined && body.code !== existing.code) {
    const duplicate =
      await MyGlobal.prisma.recipe_sharing_diet_categories.findFirst({
        where: {
          code: body.code,
          NOT: { id },
        },
      });

    if (duplicate) {
      throw new Error(`Diet category code '${body.code}' already exists`);
    }
  }

  // Prepare updated data
  const now = toISOStringSafe(new Date());

  // Update diet category
  const updated = await MyGlobal.prisma.recipe_sharing_diet_categories.update({
    where: { id },
    data: {
      code: body.code ?? undefined,
      name: body.name ?? undefined,
      description: body.description ?? undefined,
      updated_at: now,
    },
  });

  // Return updated diet category
  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
