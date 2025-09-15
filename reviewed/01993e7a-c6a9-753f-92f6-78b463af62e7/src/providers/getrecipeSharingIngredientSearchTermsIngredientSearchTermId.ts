import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IRecipeSharingIngredientSearchTerm } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredientSearchTerm";

/**
 * Retrieve ingredient search term by ID.
 *
 * This operation fetches a single ingredient search term entity from the
 * database using its unique UUID identifier. The entity includes the ID, linked
 * ingredient ID, and the actual search term string. It supports partial and
 * fuzzy ingredient search capabilities.
 *
 * @param props - Object containing the required ingredientSearchTermId
 *   parameter
 * @param props.ingredientSearchTermId - The UUID identifier of the ingredient
 *   search term to retrieve
 * @returns The ingredient search term object matching the specified ID
 * @throws {Error} Throws if no ingredient search term exists with the given ID
 */
export async function getrecipeSharingIngredientSearchTermsIngredientSearchTermId(props: {
  ingredientSearchTermId: string & tags.Format<"uuid">;
}): Promise<IRecipeSharingIngredientSearchTerm> {
  const { ingredientSearchTermId } = props;
  const record =
    await MyGlobal.prisma.recipe_sharing_ingredient_search_terms.findUniqueOrThrow(
      {
        where: { id: ingredientSearchTermId },
      },
    );
  return record;
}
