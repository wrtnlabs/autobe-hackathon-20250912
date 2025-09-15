import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingIngredientSubstitution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredientSubstitution";
import { IPageIRecipeSharingIngredientSubstitution } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingIngredientSubstitution";
import { RegularuserPayload } from "../decorators/payload/RegularuserPayload";

/**
 * Lists available ingredient substitutions for a specific ingredient.
 *
 * This endpoint retrieves ingredient substitution entries filtered by the given
 * ingredient ID and optional filters. Returns paginated substitution summaries
 * including substitute ingredient IDs, conversion ratios, and status.
 *
 * @param props - The function properties
 * @param props.regularUser - Authenticated regular user payload
 * @param props.ingredientId - Unique identifier of the ingredient to list
 *   substitutions for
 * @param props.body - Filter criteria for ingredient substitutions
 * @returns Paginated list of substitution summaries
 * @throws {Error} When the ingredient does not exist
 */
export async function patchrecipeSharingRegularUserIngredientsIngredientIdSubstitutions(props: {
  regularUser: RegularuserPayload;
  ingredientId: string & tags.Format<"uuid">;
  body: IRecipeSharingIngredientSubstitution.IRequest;
}): Promise<IPageIRecipeSharingIngredientSubstitution.ISummary> {
  const { regularUser, ingredientId, body } = props;

  // Verify the ingredient exists
  const ingredient =
    await MyGlobal.prisma.recipe_sharing_ingredients.findUnique({
      where: { id: ingredientId },
    });

  if (ingredient === null) {
    throw new Error(`Ingredient with id ${ingredientId} not found`);
  }

  // Construct where condition
  const where = {
    ingredient_id: ingredientId,
    deleted_at: null,
    ...(body.substitute_ingredient_id !== undefined &&
      body.substitute_ingredient_id !== null && {
        substitute_ingredient_id: body.substitute_ingredient_id,
      }),
    ...(body.conversion_ratio !== undefined &&
      body.conversion_ratio !== null && {
        conversion_ratio: body.conversion_ratio,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
  };

  // Pagination parameters: default to first page, 20 items per page
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  // Retrieve total count
  const total =
    await MyGlobal.prisma.recipe_sharing_ingredient_substitutions.count({
      where,
    });

  // Retrieve paginated data
  const substitutions =
    await MyGlobal.prisma.recipe_sharing_ingredient_substitutions.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: substitutions.map((substitution) => ({
      id: substitution.id,
      ingredient_id: substitution.ingredient_id,
      substitute_ingredient_id: substitution.substitute_ingredient_id,
      conversion_ratio: substitution.conversion_ratio,
      status: substitution.status,
    })),
  };
}
