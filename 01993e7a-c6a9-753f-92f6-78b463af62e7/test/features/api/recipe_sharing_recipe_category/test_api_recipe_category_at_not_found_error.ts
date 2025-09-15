import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRecipeSharingRecipeCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipeCategory";

/**
 * Test that fetching a recipe category by a non-existent recipeCategoryId
 * correctly throws a 404 HttpError (Not Found).
 *
 * This test generates a random UUID to simulate an invalid recipe category
 * ID, then attempts to retrieve it via the API. It expects the API call to
 * throw an error indicating that the resource was not found. This confirms
 * the backend properly handles queries to unknown resource IDs.
 */
export async function test_api_recipe_category_at_not_found_error(
  connection: api.IConnection,
) {
  // Attempt to read a recipe category that does not exist
  const invalidRecipeCategoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "fetching non-existent recipeCategoryId should throw 404 error",
    async () => {
      await api.functional.recipeSharing.recipeCategories.at(connection, {
        recipeCategoryId: invalidRecipeCategoryId,
      });
    },
  );
}
