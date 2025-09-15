import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRecipeSharingIngredientSearchTerm } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredientSearchTerm";

export async function test_api_ingredient_search_term_retrieval_valid_and_invalid_id(
  connection: api.IConnection,
) {
  // 1. Test valid retrieval with a random valid UUID
  const validId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const result: IRecipeSharingIngredientSearchTerm =
    await api.functional.recipeSharing.ingredientSearchTerms.at(connection, {
      ingredientSearchTermId: validId,
    });
  typia.assert(result);

  // Confirm returned id matches the requested id
  TestValidator.equals(
    "returned id matches the requested id",
    result.id,
    validId,
  );

  // Confirm id is valid UUID format
  TestValidator.predicate(
    "returned id is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      result.id,
    ),
  );

  // Confirm ingredient_id is valid UUID format
  TestValidator.predicate(
    "ingredient_id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      result.ingredient_id,
    ),
  );

  // Confirm search_term is a non-empty string
  TestValidator.predicate(
    "search_term is a non-empty string",
    typeof result.search_term === "string" && result.search_term.length > 0,
  );

  // 2. Test error for invalid UUID format
  await TestValidator.error(
    "invalid UUID format should throw error",
    async () => {
      await api.functional.recipeSharing.ingredientSearchTerms.at(connection, {
        ingredientSearchTermId: "invalid-uuid-format-string",
      });
    },
  );

  // 3. Test error for non-existent UUID
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "non-existent UUID should cause error",
    async () => {
      await api.functional.recipeSharing.ingredientSearchTerms.at(connection, {
        ingredientSearchTermId: nonExistentId,
      });
    },
  );
}
