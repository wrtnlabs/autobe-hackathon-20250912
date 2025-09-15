import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingIngredientSubstitution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredientSubstitution";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Creates a new ingredient substitution for a specified ingredient in the
 * Recipe Sharing platform.
 *
 * This function validates the existence of the original and substitute
 * ingredients, ensures no duplicate substitutions exist, and then creates a new
 * substitution entry.
 *
 * The 'status' field is set to 'pending' by default, as moderation management
 * is handled elsewhere. Timestamps are generated using toISOStringSafe to
 * ensure type safety and consistency.
 *
 * @param props - The input properties including moderator auth, ingredient ID,
 *   and substitution data
 * @param props.moderator - Authenticated moderator user making the request
 * @param props.ingredientId - UUID of the original ingredient to add
 *   substitution for
 * @param props.body - Data object containing substitute ingredient ID and
 *   conversion ratio
 * @returns The newly created ingredient substitution record
 * @throws {Error} If the original ingredient or substitute ingredient does not
 *   exist
 * @throws {Error} If a duplicate substitution already exists
 */
export async function postrecipeSharingModeratorIngredientsIngredientIdSubstitutions(props: {
  moderator: ModeratorPayload;
  ingredientId: string & tags.Format<"uuid">;
  body: IRecipeSharingIngredientSubstitution.ICreate;
}): Promise<IRecipeSharingIngredientSubstitution> {
  const { moderator, ingredientId, body } = props;

  // Verify original ingredient exists
  const originalIngredient =
    await MyGlobal.prisma.recipe_sharing_ingredients.findUnique({
      where: { id: ingredientId },
    });
  if (!originalIngredient) {
    throw new Error("Original ingredient not found");
  }

  // Verify substitute ingredient exists
  const substituteIngredient =
    await MyGlobal.prisma.recipe_sharing_ingredients.findUnique({
      where: { id: body.substitute_ingredient_id },
    });
  if (!substituteIngredient) {
    throw new Error("Substitute ingredient not found");
  }

  // Check for duplicate substitution
  const existingSubstitution =
    await MyGlobal.prisma.recipe_sharing_ingredient_substitutions.findFirst({
      where: {
        ingredient_id: ingredientId,
        substitute_ingredient_id: body.substitute_ingredient_id,
      },
    });
  if (existingSubstitution) {
    throw new Error("Duplicate substitution exists");
  }

  // Prepare timestamps
  const now = toISOStringSafe(new Date());

  // Create substitution
  const created =
    await MyGlobal.prisma.recipe_sharing_ingredient_substitutions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        ingredient_id: ingredientId,
        substitute_ingredient_id: body.substitute_ingredient_id,
        conversion_ratio: body.conversion_ratio,
        created_at: now,
        updated_at: now,
        status: "pending",
      },
    });

  return {
    id: created.id as string & tags.Format<"uuid">,
    ingredient_id: created.ingredient_id as string & tags.Format<"uuid">,
    substitute_ingredient_id: created.substitute_ingredient_id as string &
      tags.Format<"uuid">,
    conversion_ratio: created.conversion_ratio,
    created_at: created.created_at,
    updated_at: created.updated_at,
    status: created.status,
  };
}
