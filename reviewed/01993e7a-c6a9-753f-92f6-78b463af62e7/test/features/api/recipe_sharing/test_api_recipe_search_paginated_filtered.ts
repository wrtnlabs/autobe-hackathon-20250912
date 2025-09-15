import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingRecipes";
import type { IRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipes";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test the recipe search endpoint for a registered and authenticated
 * regular user.
 *
 * This test ensures that recipe searching respects filters like title
 * substring, status, and creator ID. It also verifies pagination behaviors
 * and sorting. Additionally, it tests that unauthorized users cannot access
 * this endpoint.
 *
 * Steps:
 *
 * 1. Create a new regular user via the join endpoint to authenticate.
 * 2. Perform various recipe searches with different filtering parameters
 *    (title substring, status, createdById).
 * 3. Validate pagination controls such as page number and limit affect
 *    results.
 * 4. Confirm that recipes returned match the filters and pagination metadata
 *    is consistent.
 * 5. Test unauthorized access with an unauthenticated connection to confirm
 *    failure.
 */
export async function test_api_recipe_search_paginated_filtered(
  connection: api.IConnection,
) {
  // 1. Register a new regular user
  const newUserBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: newUserBody,
    });
  typia.assert(authorizedUser);

  // 2. Prepare filtering parameters
  // We'll test with filtering by title substring (partial title), status, and created_by_id to this authorized user's id
  const testTitleSubstring = "test";
  const testStatus = "published";
  const testUserId = authorizedUser.id;

  // 3. Test searching with title substring
  const searchByTitle =
    await api.functional.recipeSharing.regularUser.recipes.index(connection, {
      body: {
        title: testTitleSubstring,
        page: 1,
        limit: 5,
      } satisfies IRecipeSharingRecipes.IRequest,
    });
  typia.assert(searchByTitle);
  TestValidator.predicate(
    "search results have matching title substrings or empty",
    searchByTitle.data.every(
      (recipe) =>
        recipe.title.toLowerCase().includes(testTitleSubstring.toLowerCase()) ||
        testTitleSubstring.length === 0,
    ),
  );
  TestValidator.predicate(
    "pagination limit respected",
    searchByTitle.pagination.limit === 5 &&
      searchByTitle.data.length <= 5 &&
      searchByTitle.pagination.current === 1,
  );

  // 4. Test searching by status
  const searchByStatus =
    await api.functional.recipeSharing.regularUser.recipes.index(connection, {
      body: {
        status: testStatus,
        page: 1,
        limit: 10,
      } satisfies IRecipeSharingRecipes.IRequest,
    });
  typia.assert(searchByStatus);
  TestValidator.predicate(
    "search results all have matching status",
    searchByStatus.data.every((recipe) => recipe.status === testStatus),
  );
  TestValidator.predicate(
    "pagination limit respected",
    searchByStatus.pagination.limit === 10 &&
      searchByStatus.data.length <= 10 &&
      searchByStatus.pagination.current === 1,
  );

  // 5. Test searching by created_by_id (the authorized user's id)
  const searchByUser =
    await api.functional.recipeSharing.regularUser.recipes.index(connection, {
      body: {
        created_by_id: testUserId,
        page: 1,
        limit: 3,
      } satisfies IRecipeSharingRecipes.IRequest,
    });
  typia.assert(searchByUser);
  // Cannot validate creator in ISummary as we don't have that info, so skip direct check
  TestValidator.predicate(
    "pagination limit respected",
    searchByUser.pagination.limit === 3 &&
      searchByUser.data.length <= 3 &&
      searchByUser.pagination.current === 1,
  );

  // 6. Test combined filtering: title + status + created_by_id with pagination and orderBy
  const combinedFilter =
    await api.functional.recipeSharing.regularUser.recipes.index(connection, {
      body: {
        title: testTitleSubstring,
        status: testStatus,
        created_by_id: testUserId,
        page: 1,
        limit: 5,
        orderBy: "created_at DESC",
      } satisfies IRecipeSharingRecipes.IRequest,
    });
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filter results match title substring",
    combinedFilter.data.every((recipe) =>
      recipe.title.toLowerCase().includes(testTitleSubstring.toLowerCase()),
    ),
  );
  TestValidator.predicate(
    "combined filter results match status",
    combinedFilter.data.every((recipe) => recipe.status === testStatus),
  );
  // Cannot check created_by_id in summary type
  TestValidator.predicate(
    "combined filter pagination limit respected",
    combinedFilter.pagination.limit === 5 &&
      combinedFilter.data.length <= 5 &&
      combinedFilter.pagination.current === 1,
  );

  // 7. Test pagination behavior by fetching second page (if multiple pages exist)
  if (combinedFilter.pagination.pages > 1) {
    const secondPage =
      await api.functional.recipeSharing.regularUser.recipes.index(connection, {
        body: {
          title: testTitleSubstring,
          status: testStatus,
          created_by_id: testUserId,
          page: 2,
          limit: 5,
          orderBy: "created_at DESC",
        } satisfies IRecipeSharingRecipes.IRequest,
      });
    typia.assert(secondPage);
    TestValidator.equals(
      "pagination page number updated",
      secondPage.pagination.current,
      2,
    );
    TestValidator.predicate(
      "combined filter second page results match title",
      secondPage.data.every((recipe) =>
        recipe.title.toLowerCase().includes(testTitleSubstring.toLowerCase()),
      ),
    );
  }

  // 8. Test unauthorized (unauthenticated) access
  // Create unauthenticated connection: clone original connection but clear headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access to recipe search fails",
    async () => {
      await api.functional.recipeSharing.regularUser.recipes.index(unauthConn, {
        body: { page: 1, limit: 1 } satisfies IRecipeSharingRecipes.IRequest,
      });
    },
  );
}
