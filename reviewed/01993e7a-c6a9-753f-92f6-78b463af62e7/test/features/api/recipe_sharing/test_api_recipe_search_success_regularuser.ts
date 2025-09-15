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
 * This E2E test validates the successful search and retrieval of a filtered,
 * paginated list of recipes by an authenticated regular user. The test workflow
 * includes:
 *
 * 1. Creating a new regular user account with unique email, username, and password
 *    hash;
 * 2. Logging in with the created user to obtain authentication tokens;
 * 3. Calling the /recipeSharing/regularUser/recipes PATCH endpoint with filter
 *    parameters on the recipe title and status;
 * 4. Validating that the response includes a paginated list of recipe summaries
 *    that match the filter criteria. All responses are type-asserted to ensure
 *    full type conformity. This test confirms that the recipe search API
 *    functions correctly under valid filtering conditions for authenticated
 *    regular users.
 */
export async function test_api_recipe_search_success_regularuser(
  connection: api.IConnection,
) {
  // 1. Create a new regular user
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(5)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const joinedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedUser);

  // 2. Login as the newly created user
  const loginBody = {
    email: joinBody.email,
    password_hash: joinBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;

  const loggedInUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);

  // 3. Perform recipe search with filters
  const searchBody = {
    title: RandomGenerator.pick([
      "Chicken",
      "Beef",
      "Vegetables",
      "Dessert",
    ] as const),
    status: RandomGenerator.pick(["published", "draft", "archived"] as const),
    limit: 10,
    page: 1,
  } satisfies IRecipeSharingRecipes.IRequest;

  const searchResult: IPageIRecipeSharingRecipes.ISummary =
    await api.functional.recipeSharing.regularUser.recipes.index(connection, {
      body: searchBody,
    });
  typia.assert(searchResult);

  // 4. Validations
  TestValidator.predicate(
    `response data should be an array`,
    Array.isArray(searchResult.data),
  );

  TestValidator.predicate(
    `response pagination current page should be 1`,
    searchResult.pagination.current === 1,
  );

  TestValidator.predicate(
    `response pagination limit should be 10`,
    searchResult.pagination.limit === 10,
  );

  if (searchResult.data.length > 0) {
    for (const summary of searchResult.data) {
      typia.assert(summary);
      TestValidator.predicate(
        `each summary's title should include filtered title`,
        summary.title.includes(searchBody.title ?? ""),
      );
      TestValidator.equals(
        `each summary's status should match filter`,
        summary.status,
        searchBody.status,
      );
    }
  }
}
