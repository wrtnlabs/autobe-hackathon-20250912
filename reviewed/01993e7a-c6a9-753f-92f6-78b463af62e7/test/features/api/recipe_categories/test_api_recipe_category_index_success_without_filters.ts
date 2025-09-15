import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingRecipeCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingRecipeCategory";
import type { IRecipeSharingRecipeCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipeCategory";

export async function test_api_recipe_category_index_success_without_filters(
  connection: api.IConnection,
) {
  // 1. Define an empty request body with no filters to get all categories
  const body = {} satisfies IRecipeSharingRecipeCategory.IRequest;

  // 2. Call the API endpoint PATCH /recipeSharing/recipeCategories with empty filters
  const response: IPageIRecipeSharingRecipeCategory.ISummary =
    await api.functional.recipeSharing.recipeCategories.search(connection, {
      body,
    });

  // 3. Assert the response data structure is valid
  typia.assert(response);

  // 4. Verify pagination fields are valid positive integers
  const pagination = response.pagination;

  TestValidator.predicate(
    "pagination current page is positive integer",
    typeof pagination.current === "number" && pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive integer",
    typeof pagination.limit === "number" && pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is positive integer",
    typeof pagination.pages === "number" && pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is positive integer",
    typeof pagination.records === "number" && pagination.records >= 0,
  );

  // 5. Verify data array exists and each category has required properties
  TestValidator.predicate(
    "response data is array",
    Array.isArray(response.data),
  );
  for (const category of response.data) {
    typia.assert(category); // Assert each category summary object
    TestValidator.predicate(
      "category id is uuid",
      typeof category.id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          category.id,
        ),
    );
    TestValidator.predicate(
      "category type is string",
      typeof category.category_type === "string",
    );
    TestValidator.predicate(
      "category name is string",
      typeof category.name === "string",
    );
    // description is optional, can be null or string
    TestValidator.predicate(
      "category description is string or null or undefined",
      category.description === null ||
        category.description === undefined ||
        typeof category.description === "string",
    );
  }
}
