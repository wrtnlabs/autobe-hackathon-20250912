import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingDietCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingDietCategories";
import type { IRecipeSharingDietCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingDietCategories";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

/**
 * This E2E test validates the moderator permission and the search
 * functionality of diet categories via the PATCH
 * /recipeSharing/dietCategories endpoint.
 *
 * Since the provided API only supports searching diet categories on this
 * endpoint, this test verifies:
 *
 * 1. Moderator user registration and login to establish authentication
 *    context.
 * 2. Authorized access to search diet categories (filtering, pagination).
 * 3. Validation that search results respect the filtering parameters.
 *
 * Note: Creation and duplicate prevention scenarios are omitted due to
 * absence of creation API for diet categories.
 */
export async function test_api_diet_category_creation_and_permission(
  connection: api.IConnection,
) {
  // 1. Moderator user registration
  const moderatorCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorCreateData,
  });
  typia.assert(moderator);

  // 2. Login as the moderator
  const moderatorLoginData = {
    email: moderatorCreateData.email,
    password_hash: moderatorCreateData.password_hash,
  } satisfies IRecipeSharingModerator.ILogin;

  const moderatorLoggedIn = await api.functional.auth.moderator.login(
    connection,
    {
      body: moderatorLoginData,
    },
  );
  typia.assert(moderatorLoggedIn);

  // 3. Search diet categories with filtering
  const filterRequest = {
    code: undefined,
    name: undefined,
    page: 1,
    limit: 10,
    orderBy: undefined,
    orderDirection: undefined,
  } satisfies IRecipeSharingDietCategories.IRequest;

  const searchResult =
    await api.functional.recipeSharing.dietCategories.indexDietCategories(
      connection,
      {
        body: filterRequest,
      },
    );
  typia.assert(searchResult);

  TestValidator.predicate(
    "search result contains data array",
    Array.isArray(searchResult.data),
  );

  TestValidator.predicate(
    "pagination current page equals 1",
    searchResult.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit equals 10",
    searchResult.pagination.limit === 10,
  );

  // Further filtering test: for example, filter by name if any exist
  if (searchResult.data.length > 0) {
    const filterByName = searchResult.data[0].name;

    const filteredRequest = {
      code: undefined,
      name: filterByName,
      page: 1,
      limit: 10,
    } satisfies IRecipeSharingDietCategories.IRequest;

    const filteredResult =
      await api.functional.recipeSharing.dietCategories.indexDietCategories(
        connection,
        {
          body: filteredRequest,
        },
      );
    typia.assert(filteredResult);

    TestValidator.predicate(
      "filtered result all have matching name",
      filteredResult.data.every((x) => x.name === filterByName),
    );
  }
}
