import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingRecipeCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingRecipeCategory";
import type { IRecipeSharingRecipeCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipeCategory";

/**
 * Test retrieval of paginated recipe categories filtered by categoryType.
 * Validate response includes only categories of the specified type.
 */
export async function test_api_recipe_category_index_filter_by_category_type(
  connection: api.IConnection,
) {
  const filteringCategoryType = "cuisine";

  const requestBody = {
    page: 1,
    limit: 10,
    category_type: filteringCategoryType,
    name: null,
  } satisfies IRecipeSharingRecipeCategory.IRequest;

  const response: IPageIRecipeSharingRecipeCategory.ISummary =
    await api.functional.recipeSharing.recipeCategories.search(connection, {
      body: requestBody,
    });
  typia.assert(response);

  TestValidator.predicate(
    "pagination.current is non-negative integer",
    Number.isInteger(response.pagination.current) &&
      response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative integer",
    Number.isInteger(response.pagination.limit) &&
      response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative integer",
    Number.isInteger(response.pagination.records) &&
      response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative integer",
    Number.isInteger(response.pagination.pages) &&
      response.pagination.pages >= 0,
  );

  TestValidator.predicate("data is array", Array.isArray(response.data));

  for (const category of response.data) {
    typia.assert(category);
    TestValidator.equals(
      `category_type must be '${filteringCategoryType}'`,
      category.category_type,
      filteringCategoryType,
    );

    TestValidator.predicate(
      `category id is non-empty string`,
      typeof category.id === "string" && category.id.length > 0,
    );
    TestValidator.predicate(
      `category name is non-empty string`,
      typeof category.name === "string" && category.name.length > 0,
    );

    TestValidator.predicate(
      "category description optional",
      category.description === null ||
        category.description === undefined ||
        typeof category.description === "string",
    );
  }
}
