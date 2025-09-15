import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingIngredientSubstitution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredientSubstitution";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Update an existing ingredient substitution linked to a given ingredient.
 *
 * This operation modifies the conversion ratio and moderation status. It
 * ensures the substitution exists and belongs to the specified ingredient. The
 * creation timestamp remains unchanged, and updated timestamp is set
 * automatically.
 *
 * Authorization: Requires moderator role. Authorization is handled externally.
 *
 * @param props - Object containing moderator payload, ingredientId,
 *   substitutionId, and update body.
 * @param props.moderator - The authenticated moderator payload.
 * @param props.ingredientId - UUID of the ingredient to which substitution
 *   belongs.
 * @param props.substitutionId - UUID of the substitution to update.
 * @param props.body - Data containing conversion_ratio and status to update.
 * @returns The updated ingredient substitution record.
 * @throws {Error} Throws if the substitution does not exist for the given
 *   ingredient.
 */
export async function putrecipeSharingModeratorIngredientsIngredientIdSubstitutionsSubstitutionId(props: {
  moderator: ModeratorPayload;
  ingredientId: string & tags.Format<"uuid">;
  substitutionId: string & tags.Format<"uuid">;
  body: IRecipeSharingIngredientSubstitution.IUpdate;
}): Promise<IRecipeSharingIngredientSubstitution> {
  const { moderator, ingredientId, substitutionId, body } = props;

  // Verify that the substitution exists and belongs to the ingredient
  const existingSubstitution =
    await MyGlobal.prisma.recipe_sharing_ingredient_substitutions.findFirstOrThrow(
      {
        where: {
          id: substitutionId,
          ingredient_id: ingredientId,
        },
      },
    );

  // Current timestamp for updated_at
  const now = toISOStringSafe(new Date());

  // Update the substitution record
  const updatedSubstitution =
    await MyGlobal.prisma.recipe_sharing_ingredient_substitutions.update({
      where: { id: substitutionId },
      data: {
        conversion_ratio: body.conversion_ratio,
        status: body.status,
        updated_at: now,
      },
    });

  // Return the updated substitution with correct date formats
  return {
    id: updatedSubstitution.id,
    ingredient_id: updatedSubstitution.ingredient_id,
    substitute_ingredient_id: updatedSubstitution.substitute_ingredient_id,
    conversion_ratio: updatedSubstitution.conversion_ratio,
    created_at: toISOStringSafe(updatedSubstitution.created_at),
    updated_at: toISOStringSafe(updatedSubstitution.updated_at),
    status: updatedSubstitution.status as "pending" | "approved" | "rejected",
  };
}
