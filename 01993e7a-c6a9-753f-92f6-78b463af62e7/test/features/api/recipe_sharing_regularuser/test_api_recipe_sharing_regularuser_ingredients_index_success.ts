import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingIngredient";
import type { IRecipeSharingIngredient } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredient";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Validate the recipe sharing platform's regular user ingredient search
 * functionality.
 *
 * This E2E test covers the entire user flow for retrieving a filtered and
 * paginated list of ingredients as a regular user in the recipe sharing
 * platform.
 *
 * The test performs the following steps:
 *
 * 1. Registers a new regular user with valid email, username, and hashed
 *    password.
 * 2. Logs in the newly registered user to obtain authentication tokens.
 * 3. Uses the authenticated context to call the ingredient search API with
 *    realistic filter and pagination parameters.
 * 4. Validates the API response to ensure it has proper pagination metadata
 *    and ingredient summaries list according to the request.
 * 5. Uses typia.assert to ensure strict runtime type correctness of all
 *    responses.
 * 6. Validates logical business rules including pagination correctness.
 *
 * This ensures the entire backend works seamlessly for the regular user
 * ingredient search feature, verifying both happy path and core business
 * constraints.
 */
export async function test_api_recipe_sharing_regularuser_ingredients_index_success(
  connection: api.IConnection,
) {
  // 1. Register a new regular user
  const userCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    username: RandomGenerator.name(2),
    password_hash: RandomGenerator.alphaNumeric(16),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser = await api.functional.auth.regularUser.join(
    connection,
    {
      body: userCreateBody,
    },
  );
  typia.assert(authorizedUser);

  // 2. Log in with the created user credentials
  const userLoginBody = {
    email: userCreateBody.email,
    password_hash: userCreateBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;

  const loggedInUser = await api.functional.auth.regularUser.login(connection, {
    body: userLoginBody,
  });
  typia.assert(loggedInUser);

  // 3. Prepare ingredient search request with pagination and filters
  const ingredientSearchBody = {
    page: 1,
    limit: 10,
    search: RandomGenerator.substring(
      "ingredient example search term for test",
    ),
    brand: null,
    sortBy: "name",
    sortOrder: "asc",
  } satisfies IRecipeSharingIngredient.IRequest;

  // 4. Call the ingredient search API
  const ingredientPage =
    await api.functional.recipeSharing.regularUser.ingredients.index(
      connection,
      {
        body: ingredientSearchBody,
      },
    );
  typia.assert(ingredientPage);

  // 5. Validate pagination fields
  TestValidator.predicate(
    "pagination current page is positive",
    ingredientPage.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    ingredientPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    ingredientPage.pagination.pages > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    ingredientPage.pagination.records >= 0,
  );

  // 6. Validate each ingredient summary
  for (const summary of ingredientPage.data) {
    TestValidator.predicate(
      `ingredient id is valid UUID for ${summary.name}`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        summary.id,
      ),
    );
    TestValidator.predicate(
      `ingredient name is non-empty for id ${summary.id}`,
      summary.name.length > 0,
    );
    TestValidator.predicate(
      `ingredient brand is string or null for id ${summary.id}`,
      summary.brand === null || typeof summary.brand === "string",
    );
  }
}
