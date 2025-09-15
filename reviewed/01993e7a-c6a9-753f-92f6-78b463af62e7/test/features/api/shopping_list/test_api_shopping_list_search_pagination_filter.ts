import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingShoppingList } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingShoppingList";
import type { IRecipeSharingShoppingList } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingShoppingList";

/**
 * Test searching and retrieving paginated shopping lists with filters.
 *
 * This test validates the public API endpoint for retrieving shopping lists
 * with optional filters for user ID and name, along with pagination
 * controls. It covers:
 *
 * 1. Basic pagination without filters.
 * 2. Filtering only by name substring.
 * 3. Filtering only by user ID.
 * 4. Combined filtering by both user ID and name.
 *
 * Each response is asserted to conform to expected types with typia.assert,
 * and TestValidator is used to verify pagination consistency, filtering
 * correctness, and result size limits. No authentication is required for
 * this endpoint.
 */
export async function test_api_shopping_list_search_pagination_filter(
  connection: api.IConnection,
) {
  // 1. Basic pagination test: page = 1, limit = 5, empty filters
  const basicPaginationBody = {
    page: 1,
    limit: 5,
  } satisfies IRecipeSharingShoppingList.IRequest;
  const basicPaginationResult =
    await api.functional.recipeSharing.shoppingLists.index(connection, {
      body: basicPaginationBody,
    });
  typia.assert(basicPaginationResult);
  TestValidator.predicate(
    "basicPagination: page should be 1",
    basicPaginationResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "basicPagination: limit should be 5",
    basicPaginationResult.pagination.limit === 5,
  );
  TestValidator.predicate(
    "basicPagination: data length should be <= limit",
    basicPaginationResult.data.length <= 5,
  );

  // 2. Name filter test: filter by a substring in name
  const nameFilterValue = "test";
  const nameFilterBody = {
    name: nameFilterValue,
    page: 1,
    limit: 10,
  } satisfies IRecipeSharingShoppingList.IRequest;
  const nameFilteredResult =
    await api.functional.recipeSharing.shoppingLists.index(connection, {
      body: nameFilterBody,
    });
  typia.assert(nameFilteredResult);
  TestValidator.predicate(
    "nameFilteredResult: all items should include name filter substring",
    nameFilteredResult.data.every((item) =>
      item.name.includes(nameFilterValue),
    ),
  );
  TestValidator.predicate(
    "nameFilteredResult: limit respected",
    nameFilteredResult.data.length <= 10,
  );

  // 3. user_id filter test: filter by random user_id (UUID format)
  const userIdFilterValue = typia.random<string & tags.Format<"uuid">>();
  const userIdFilterBody = {
    user_id: userIdFilterValue,
    page: 1,
    limit: 5,
  } satisfies IRecipeSharingShoppingList.IRequest;
  const userIdFilteredResult =
    await api.functional.recipeSharing.shoppingLists.index(connection, {
      body: userIdFilterBody,
    });
  typia.assert(userIdFilteredResult);
  TestValidator.predicate(
    "userIdFilteredResult: pagination page equals 1",
    userIdFilteredResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "userIdFilteredResult: limit respected",
    userIdFilteredResult.data.length <= 5,
  );

  // 4. Combined filter test: both user_id and name filters
  const combinedFilterBody = {
    user_id: userIdFilterValue,
    name: nameFilterValue,
    page: 1,
    limit: 3,
  } satisfies IRecipeSharingShoppingList.IRequest;
  const combinedFilteredResult =
    await api.functional.recipeSharing.shoppingLists.index(connection, {
      body: combinedFilterBody,
    });
  typia.assert(combinedFilteredResult);
  TestValidator.predicate(
    "combinedFilteredResult: all items include name filter substring",
    combinedFilteredResult.data.every((item) =>
      item.name.includes(nameFilterValue),
    ),
  );
  TestValidator.predicate(
    "combinedFilteredResult: pagination page equals 1",
    combinedFilteredResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "combinedFilteredResult: limit respected",
    combinedFilteredResult.data.length <= 3,
  );
}
