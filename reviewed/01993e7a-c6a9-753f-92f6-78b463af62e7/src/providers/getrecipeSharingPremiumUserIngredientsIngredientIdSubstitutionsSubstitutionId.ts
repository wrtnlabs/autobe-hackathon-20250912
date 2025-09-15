import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingIngredientSubstitution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredientSubstitution";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

/**
 * Retrieve detailed information about a specific ingredient substitution.
 *
 * This operation fetches the full substitution record identified by
 * substitutionId for the ingredient specified by ingredientId. Only accessible
 * to authenticated premium users.
 *
 * @param props - The properties needed to retrieve the substitution.
 * @param props.premiumUser - The authenticated premium user making the request.
 * @param props.ingredientId - The UUID of the ingredient.
 * @param props.substitutionId - The UUID of the substitution.
 * @returns The detailed ingredient substitution record.
 * @throws {Error} If the substitution record is not found (404).
 * @throws {Error} If the user is unauthorized (403).
 */
export async function getrecipeSharingPremiumUserIngredientsIngredientIdSubstitutionsSubstitutionId(props: {
  premiumUser: PremiumuserPayload;
  ingredientId: string & tags.Format<"uuid">;
  substitutionId: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingIngredientSubstitution> {
  const { premiumUser, ingredientId, substitutionId } = props;

  // Authorization is implied by presence of premiumUser

  // Fetch ingredient substitution record
  const substitution =
    await MyGlobal.prisma.recipe_sharing_ingredient_substitutions.findFirstOrThrow(
      {
        where: {
          id: substitutionId,
          ingredient_id: ingredientId,
        },
      },
    );

  // Validate that status is one of allowed enum values
  typia.assertGuard<"pending" | "approved" | "rejected">(substitution.status);

  return {
    id: substitution.id,
    ingredient_id: substitution.ingredient_id,
    substitute_ingredient_id: substitution.substitute_ingredient_id,
    conversion_ratio: substitution.conversion_ratio,
    created_at: toISOStringSafe(substitution.created_at),
    updated_at: toISOStringSafe(substitution.updated_at),
    status: substitution.status,
  };
}
