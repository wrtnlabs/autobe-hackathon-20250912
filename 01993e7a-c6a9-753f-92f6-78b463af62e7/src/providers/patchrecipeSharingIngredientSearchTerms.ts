import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingIngredientSearchTerms } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredientSearchTerms";
import { IPageIRecipeSharingIngredientSearchTerms } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingIngredientSearchTerms";

/**
 * Retrieve paginated ingredient search terms with optional filtering by
 * ingredient ID and partial search term.
 *
 * This operation supports flexible pagination and search filtering over the
 * `recipe_sharing_ingredient_search_terms` table.
 *
 * No authentication required.
 *
 * @param props - The request parameters containing pagination and filters.
 * @param props.body - The request body including page, limit, ingredient_id,
 *   and search_term.
 * @returns A paginated list of ingredient search terms matching the criteria.
 * @throws {Error} Throws if any unexpected database error occurs.
 */
export async function patchrecipeSharingIngredientSearchTerms(props: {
  body: IRecipeSharingIngredientSearchTerms.IRequest;
}): Promise<IPageIRecipeSharingIngredientSearchTerms> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const whereCondition = {
    ...(body.ingredient_id !== undefined &&
      body.ingredient_id !== null && {
        ingredient_id: body.ingredient_id,
      }),
    ...(body.search_term !== undefined &&
      body.search_term !== null && {
        search_term: { contains: body.search_term },
      }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.recipe_sharing_ingredient_search_terms.findMany({
      where: whereCondition,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.recipe_sharing_ingredient_search_terms.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results,
  };
}
