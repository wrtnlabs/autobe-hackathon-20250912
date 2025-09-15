import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingMealPlanEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingMealPlanEntry";
import type { IRecipeSharingMealPlanEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlanEntry";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";

/**
 * This E2E test verifies that a premium user cannot list meal plan entries
 * without authentication.
 *
 * It performs the following steps:
 *
 * 1. Registers a premium user via the join endpoint.
 * 2. Attempts to list meal plan entries without authentication by using a
 *    connection with empty headers.
 * 3. Expects an authorization error to be thrown.
 *
 * This test ensures proper authentication enforcement for premium user meal
 * plan access.
 */
export async function test_api_meal_plan_entries_listing_authorization_failure_for_premium_user(
  connection: api.IConnection,
) {
  // Step 1: Register a premium user
  const premiumUserEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: premiumUserEmail,
    password_hash: RandomGenerator.alphaNumeric(20),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingPremiumUser.ICreate;

  const authorizedResponse: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedResponse);

  // Step 2: Attempt unauthorized access by cloning connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 3: Attempt to list meal plan entries with unauthorized connection using a random UUID for mealPlanId
  const randomMealPlanId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "access meal plan entries should fail without authentication",
    async () => {
      await api.functional.recipeSharing.premiumUser.mealPlans.entries.index(
        unauthenticatedConnection,
        {
          mealPlanId: randomMealPlanId,
        },
      );
    },
  );
}
