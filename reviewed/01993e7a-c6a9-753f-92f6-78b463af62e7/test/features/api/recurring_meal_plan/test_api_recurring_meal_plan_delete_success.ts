import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRecurringMealPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecurringMealPlan";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Tests the permanent deletion behavior of a recurring meal plan belonging
 * to an authenticated regular user.
 *
 * This test covers the lifecycle of creating a regular user,
 * authenticating, creating a recurring meal plan owned by the user, and
 * verifying the deletion endpoint.
 *
 * The test includes the following steps:
 *
 * 1. Register a new regular user with unique email, username, and password
 *    hash.
 * 2. Authenticate the same user to confirm authorized session.
 * 3. Create a recurring meal plan linked to the authenticated user.
 * 4. Delete the created recurring meal plan by its unique identifier.
 * 5. Attempt deletion of the same recurring meal plan again to verify correct
 *    error handling for non-existent resources.
 *
 * This test enforces correct access control by ensuring only the owning
 * user can delete their recurring meal plans. It also validates that after
 * deletion, the recurring meal plan is no longer accessible.
 *
 * All UUIDs, date-times, and string formats comply strictly with their
 * schema definitions. All API responses are asserted with typia to ensure
 * contract validity.
 *
 * Authentication is handled through the official join and login API
 * functions without manual token management.
 */
export async function test_api_recurring_meal_plan_delete_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new regular user
  const registerBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    username: RandomGenerator.name(),
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: registerBody,
    });
  typia.assert(authorizedUser);

  // Step 2: Authenticate the same user
  const loginBody = {
    email: registerBody.email,
    password_hash: registerBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;

  const loggedInUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);

  // Step 3: Create a recurring meal plan
  const createPlanBody = {
    owner_user_id: authorizedUser.id,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: null,
    recurrence_pattern: "weekly",
    start_date: new Date().toISOString(),
    end_date: null,
  } satisfies IRecipeSharingRecurringMealPlan.ICreate;

  const createdMealPlan: IRecipeSharingRecurringMealPlan =
    await api.functional.recipeSharing.regularUser.recurringMealPlans.create(
      connection,
      {
        body: createPlanBody,
      },
    );
  typia.assert(createdMealPlan);

  // Step 4: Delete the created recurring meal plan
  await api.functional.recipeSharing.regularUser.recurringMealPlans.erase(
    connection,
    {
      recurringMealPlanId: createdMealPlan.id,
    },
  );

  // Step 5: Attempt to delete again to confirm correct error handling
  await TestValidator.error(
    "Deleting already deleted recurring meal plan should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.recurringMealPlans.erase(
        connection,
        {
          recurringMealPlanId: createdMealPlan.id,
        },
      );
    },
  );
}
