import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingRecipeCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingRecipeCategory";
import type { IRecipeSharingRecipeCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipeCategory";

/**
 * Test retrieval of paginated recipe categories filtered by partial name
 * substring.
 *
 * This test validates the PATCH /recipeSharing/recipeCategories API
 * endpoint for retrieving recipe categories filtered by a substring of the
 * category name. It simulates a real search scenario where users filter
 * categories by a partial name, ensuring returned data matches the filter
 * criteria.
 *
 * Steps:
 *
 * 1. Generate a realistic random category name string.
 * 2. Derive a substring filter from the random name (ensuring non-empty
 *    substring).
 * 3. Construct the request body with the `name` filter set to the substring.
 * 4. Call the API endpoint with the constructed filter and optional
 *    pagination.
 * 5. Assert the response type correctness using typia.assert.
 * 6. Validate all returned categories have `name` including the substring
 *    filter, confirming accurate filtering in the backend.
 * 7. Validate pagination properties (`current`, `limit`, `pages`, `records`)
 *    are numbers and logically consistent.
 *
 * The test guarantees type-safe API interaction, realistic test data, and
 * comprehensive validation of filtering functionality for recipe
 * categories. It ensures the filter substring is respected strictly in
 * every returned item.
 *
 * @param connection - The API connection object to invoke the endpoint.
 */
export async function test_api_recipe_category_index_filter_by_name_substring(
  connection: api.IConnection,
) {
  // 1. Generate a random realistic category name string (simulate realistic value)
  const fullCategoryName = typia.random<string>();

  // 2. Derive a substring filter (choose a slice from the random string ensuring length at least 1)
  const startIndex = Math.floor(fullCategoryName.length / 4);
  const endIndex = Math.min(startIndex + 3, fullCategoryName.length);
  const nameFilterSubstring = fullCategoryName
    .substring(startIndex, endIndex)
    .trim();

  // Ensure substring is non-empty; fallback if empty
  const filterName =
    nameFilterSubstring.length === 0
      ? fullCategoryName.substring(0, 1)
      : nameFilterSubstring;

  // 3. Construct request body with name filter
  const requestBody = {
    name: filterName,
  } satisfies IRecipeSharingRecipeCategory.IRequest;

  // 4. Call the API endpoint with filter
  const response: IPageIRecipeSharingRecipeCategory.ISummary =
    await api.functional.recipeSharing.recipeCategories.search(connection, {
      body: requestBody,
    });

  // 5. Assert the response type perfectly
  typia.assert(response);

  // 6. Verify all returned categories have names including the substring filter
  for (const category of response.data) {
    TestValidator.predicate(
      `category name includes filter substring '${filterName}'`,
      category.name.includes(filterName),
    );
  }

  // 7. Validate pagination fields are numbers and logically consistent
  const pagination = response.pagination;
  TestValidator.predicate(
    "Pagination current is a non-negative integer",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "Pagination limit is a positive integer",
    pagination.limit > 0,
  );
  TestValidator.predicate(
    "Pagination pages is non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "Pagination records is non-negative",
    pagination.records >= 0,
  );
}
