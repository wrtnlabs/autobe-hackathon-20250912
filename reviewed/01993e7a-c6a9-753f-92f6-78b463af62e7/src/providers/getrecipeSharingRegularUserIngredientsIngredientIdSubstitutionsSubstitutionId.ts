import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingIngredientSubstitution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredientSubstitution";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Retrieve detailed information about a specific ingredient substitution.
 *
 * This function fetches a unique substitution record from
 * `recipe_sharing_ingredient_substitutions` matching the given `substitutionId`
 * and `ingredientId`. It returns all substitution details including conversion
 * ratio and moderation status.
 *
 * @param props - The request properties
 * @param props.regularUser - The authenticated regular user making the request
 * @param props.ingredientId - UUID of the original ingredient
 * @param props.substitutionId - UUID of the substitution record
 * @returns The detailed ingredient substitution record
 * @throws {Error} Throws if no matching substitution is found.
 */
export async function getrecipeSharingRegularUserIngredientsIngredientIdSubstitutionsSubstitutionId(props: {
  regularUser: RegularuserPayload;
  ingredientId: string & tags.Format<"uuid">;
  substitutionId: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingIngredientSubstitution> {
  const { regularUser, ingredientId, substitutionId } = props;

  // Fetch the substitution record matching ingredientId and substitutionId
  const substitution =
    await MyGlobal.prisma.recipe_sharing_ingredient_substitutions.findFirstOrThrow(
      {
        where: {
          id: substitutionId,
          ingredient_id: ingredientId,
        },
      },
    );

  // Return with proper date string conversions
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
