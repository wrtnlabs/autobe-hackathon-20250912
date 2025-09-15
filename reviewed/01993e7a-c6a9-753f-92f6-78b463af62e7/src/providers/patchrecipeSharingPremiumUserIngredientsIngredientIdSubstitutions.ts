import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingIngredientSubstitution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredientSubstitution";
import { IPageIRecipeSharingIngredientSubstitution } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingIngredientSubstitution";
import { PremiumuserPayload } from "../decorators/payload/PremiumuserPayload";

export async function patchrecipeSharingPremiumUserIngredientsIngredientIdSubstitutions(props: {
  premiumUser: PremiumuserPayload;
  ingredientId: string & tags.Format<"uuid">;
  body: IRecipeSharingIngredientSubstitution.IRequest;
}): Promise<IPageIRecipeSharingIngredientSubstitution.ISummary> {
  const { premiumUser, ingredientId, body } = props;

  // Ensure the ingredient exists
  const ingredient =
    await MyGlobal.prisma.recipe_sharing_ingredients.findUnique({
      where: { id: ingredientId },
    });

  if (!ingredient) {
    throw new Error("Ingredient not found");
  }

  // Pagination defaults and calculations
  // The IRequest interface doesn't contain page and limit, so we provide defaults
  // and remove references to body.page and body.limit which cause errors
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<0> as number;
  const limit = 20 as number & tags.Type<"int32"> & tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  // Construct filtering
  const whereClause: {
    ingredient_id: string & tags.Format<"uuid">;
    substitute_ingredient_id?: string & tags.Format<"uuid">;
    conversion_ratio?: number;
    status?: string;
  } = { ingredient_id: ingredientId };

  if (
    body.substitute_ingredient_id !== undefined &&
    body.substitute_ingredient_id !== null
  ) {
    whereClause.substitute_ingredient_id = body.substitute_ingredient_id;
  }

  if (body.conversion_ratio !== undefined && body.conversion_ratio !== null) {
    whereClause.conversion_ratio = body.conversion_ratio;
  }

  if (body.status !== undefined && body.status !== null) {
    whereClause.status = body.status;
  }

  // Execute count and data queries concurrently
  const [total, results] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_ingredient_substitutions.count({
      where: whereClause,
    }),
    MyGlobal.prisma.recipe_sharing_ingredient_substitutions.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        ingredient_id: true,
        substitute_ingredient_id: true,
        conversion_ratio: true,
        status: true,
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      ingredient_id: item.ingredient_id,
      substitute_ingredient_id: item.substitute_ingredient_id,
      conversion_ratio: item.conversion_ratio,
      status: item.status,
    })),
  };
}
