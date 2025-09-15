import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingMealPlanEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingMealPlanEntry";
import type { IRecipeSharingMealPlanEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlanEntry";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Validate that retrieving meal plan entries fails when authorization is
 * invalid or missing.
 *
 * This test confirms the backend enforces authentication and authorization
 * requirements for the meal plan entries listing API. Specifically,
 * attempts to access the endpoint without valid authentication tokens
 * should be rejected.
 *
 * The test workflow includes:
 *
 * 1. Signing up a new regular user to establish a valid account.
 * 2. Attempting to retrieve meal plan entries of an arbitrary mealPlanId with
 *    an unauthenticated connection.
 * 3. Attempting to retrieve meal plan entries with an invalid token.
 * 4. Confirming that both attempts are rejected with authorization errors.
 *
 * This test ensures robust enforcement of security on meal plan access.
 */
export async function test_api_meal_plan_entries_listing_authorization_failure(
  connection: api.IConnection,
) {
  // Step 1: Sign up a new regular user to ensure system handles authorization
  const userCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser = await api.functional.auth.regularUser.join(
    connection,
    {
      body: userCreateBody,
    },
  );
  typia.assert(authorizedUser);

  // Step 2: Create an unauthenticated connection by copying connection and emptying headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 3: Use arbitrary mealPlanId for tests
  const dummyMealPlanId = typia.random<string & tags.Format<"uuid">>();

  // Attempt 1: Unauthorized access with no token
  await TestValidator.error(
    "retrieve meal plan entries without authentication should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.mealPlans.entries.index(
        unauthenticatedConnection,
        {
          mealPlanId: dummyMealPlanId,
        },
      );
    },
  );

  // Step 4: Attempt with invalid token
  // Create a connection object with invalid Authorization header
  const invalidTokenConnection: api.IConnection = {
    ...connection,
    headers: {
      Authorization: "Bearer invalid.token.value",
    },
  };

  // Attempt 2: Unauthorized access with invalid token
  await TestValidator.error(
    "retrieve meal plan entries with invalid token should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.mealPlans.entries.index(
        invalidTokenConnection,
        {
          mealPlanId: dummyMealPlanId,
        },
      );
    },
  );
}
