import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingRecurringMealPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingRecurringMealPlans";
import type { IRecipeSharingRecurringMealPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecurringMealPlans";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test searching and retrieving a paginated list of recurring meal plans
 * owned by a regular user.
 *
 * This end-to-end test covers the complete workflow:
 *
 * 1. Create a new regular user via /auth/regularUser/join API
 * 2. Authenticate and obtain authorization for the user
 * 3. Search recurring meal plans for this user with pagination and filters
 * 4. Validate the pagination metadata and that recurring meal plans belong to
 *    the user
 *
 * The test verifies the correctness of pagination, filtering, and correct
 * ownership of the recurring plans.
 */
export async function test_api_recurring_meal_plans_search_success(
  connection: api.IConnection,
) {
  // === Step 1: Regular user account creation and authentication ===
  const userCreateBody = {
    email: `${RandomGenerator.alphabets(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(20),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(user);

  // === Step 2: Search recurring meal plans for this user ===

  const page = 1 satisfies number as number;
  const limit = 3 satisfies number as number;

  const requestBody = {
    page: page,
    limit: limit,
    owner_user_id: user.id,
  } satisfies IRecipeSharingRecurringMealPlans.IRequest;

  const response: IPageIRecipeSharingRecurringMealPlans =
    await api.functional.recipeSharing.regularUser.recurringMealPlans.index(
      connection,
      { body: requestBody },
    );
  typia.assert(response);

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page must be 1",
    response.pagination.current === page,
  );
  TestValidator.predicate(
    "pagination limit must match requested limit",
    response.pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination pages must be at least 1",
    response.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records must be equal or larger than data length",
    response.pagination.records >= response.data.length,
  );

  // Validate all returned recurring meal plans belong to the authenticated user
  for (const plan of response.data) {
    typia.assert(plan);
    TestValidator.equals(
      "owner_user_id matches authenticated user",
      plan.owner_user_id,
      user.id,
    );
    TestValidator.predicate(
      "recurring meal plan id valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        plan.id,
      ),
    );
  }
}
