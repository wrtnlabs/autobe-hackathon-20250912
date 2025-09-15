import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRecipeSharingRecipeCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipeCategory";

/**
 * Test retrieval of recipe category details by valid recipeCategoryId.
 *
 * This test validates that the API endpoint GET
 * /recipeSharing/recipeCategories/{recipeCategoryId} correctly returns a
 * recipe category with all expected fields.
 *
 * Steps:
 *
 * 1. Generate a valid UUID to use as recipeCategoryId.
 * 2. Call the API endpoint to get the recipe category details.
 * 3. Assert the response is properly typed and contains all required fields.
 */
export async function test_api_recipe_category_at_success_with_valid_id(
  connection: api.IConnection,
) {
  const recipeCategoryId = typia.random<string & tags.Format<"uuid">>();

  const category: IRecipeSharingRecipeCategory =
    await api.functional.recipeSharing.recipeCategories.at(connection, {
      recipeCategoryId,
    });
  typia.assert(category);

  // Validate non-null properties
  TestValidator.predicate(
    "category has non-empty id",
    typeof category.id === "string" && category.id.length > 0,
  );
  TestValidator.predicate(
    "category has non-empty category_type",
    typeof category.category_type === "string" &&
      category.category_type.length > 0,
  );
  TestValidator.predicate(
    "category has non-empty name",
    typeof category.name === "string" && category.name.length > 0,
  );

  // Validate optional description (string or null or undefined)
  TestValidator.predicate(
    "category description is string or null or undefined",
    category.description === null ||
      category.description === undefined ||
      typeof category.description === "string",
  );

  TestValidator.predicate(
    "category has created_at",
    typeof category.created_at === "string" && category.created_at.length > 0,
  );
  TestValidator.predicate(
    "category has updated_at",
    typeof category.updated_at === "string" && category.updated_at.length > 0,
  );
}
