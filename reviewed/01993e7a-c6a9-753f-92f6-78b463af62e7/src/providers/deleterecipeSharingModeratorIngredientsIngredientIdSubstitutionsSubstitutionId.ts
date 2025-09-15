import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Delete an ingredient substitution by its substitution ID and associated
 * ingredient ID.
 *
 * This operation permanently removes the ingredient substitution record from
 * the database. Only users with moderator role (provided in props) are
 * authorized to perform this action. If the record does not exist, an error
 * will be thrown.
 *
 * @param props - The function props including moderator authentication and path
 *   parameters.
 * @param props.moderator - The authenticated moderator performing the deletion.
 * @param props.ingredientId - UUID of the ingredient linked to the
 *   substitution.
 * @param props.substitutionId - UUID of the ingredient substitution to delete.
 * @throws {Error} Throws if the substitution does not exist or is not linked to
 *   the ingredient.
 */
export async function deleterecipeSharingModeratorIngredientsIngredientIdSubstitutionsSubstitutionId(props: {
  moderator: ModeratorPayload;
  ingredientId: string & tags.Format<"uuid">;
  substitutionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, ingredientId, substitutionId } = props;

  // Verify that the substitution exists and is linked to the specified ingredient
  await MyGlobal.prisma.recipe_sharing_ingredient_substitutions.findFirstOrThrow(
    {
      where: {
        id: substitutionId,
        ingredient_id: ingredientId,
      },
    },
  );

  // Hard delete the substitution
  await MyGlobal.prisma.recipe_sharing_ingredient_substitutions.delete({
    where: { id: substitutionId },
  });
}
