import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRecurringMealPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecurringMealPlan";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * E2E test function for verifying the successful creation and detailed
 * retrieval of recurring meal plans by an authenticated regular user.
 *
 * This test covers the entire business workflow where User1 creates an account,
 * logs in, creates a recurring meal plan, and retrieves it. Then User2 is
 * created and logged in to ensure they cannot access User1's meal plan,
 * verifying authorization enforcement is functioning correctly.
 *
 * Scenario Steps:
 *
 * 1. Create User1 and authenticate
 * 2. User1 creates a recurring meal plan with valid recurrence pattern and dates
 * 3. User1 retrieves the meal plan details and validates data integrity
 * 4. Create User2 and authenticate
 * 5. User2 tries to retrieve User1's meal plan details and expects an
 *    authorization error
 *
 * All API responses are validated using typia.assert and TestValidator to
 * ensure strict compliance with provided DTOs and API contracts.
 */
export async function test_api_recurring_meal_plan_get_detail_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate User1
  const user1CreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const user1Authorized: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: user1CreateBody,
    });
  typia.assert(user1Authorized);

  const user1LoginBody = {
    email: user1CreateBody.email,
    password_hash: user1CreateBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;

  const user1LoggedIn: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: user1LoginBody,
    });
  typia.assert(user1LoggedIn);

  TestValidator.equals(
    "User1 authorized and logged in with consistent id",
    user1LoggedIn.id,
    user1Authorized.id,
  );

  // 2. User1 creates a recurring meal plan
  const recurringMealPlanCreateBody = {
    owner_user_id: user1Authorized.id,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    recurrence_pattern: "weekly",
    start_date: new Date().toISOString(),
    end_date: null,
  } satisfies IRecipeSharingRecurringMealPlan.ICreate;

  const createdRecurringMealPlan: IRecipeSharingRecurringMealPlan =
    await api.functional.recipeSharing.regularUser.recurringMealPlans.create(
      connection,
      { body: recurringMealPlanCreateBody },
    );
  typia.assert(createdRecurringMealPlan);

  TestValidator.equals(
    "Created recurring meal plan owner_user_id matches User1",
    createdRecurringMealPlan.owner_user_id,
    user1Authorized.id,
  );

  // 3. User1 retrieves the recurring meal plan details
  const retrievedRecurringMealPlan: IRecipeSharingRecurringMealPlan =
    await api.functional.recipeSharing.regularUser.recurringMealPlans.at(
      connection,
      { recurringMealPlanId: createdRecurringMealPlan.id },
    );
  typia.assert(retrievedRecurringMealPlan);

  TestValidator.equals(
    "Retrieved recurring meal plan id matches created id",
    retrievedRecurringMealPlan.id,
    createdRecurringMealPlan.id,
  );

  TestValidator.equals(
    "Retrieved recurring meal plan owner_user_id matches User1",
    retrievedRecurringMealPlan.owner_user_id,
    user1Authorized.id,
  );

  TestValidator.equals(
    "Meal plan recurrence_pattern consistency",
    retrievedRecurringMealPlan.recurrence_pattern,
    recurringMealPlanCreateBody.recurrence_pattern,
  );

  // 4. Create and authenticate User2
  const user2CreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const user2Authorized: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: user2CreateBody,
    });
  typia.assert(user2Authorized);

  const user2LoginBody = {
    email: user2CreateBody.email,
    password_hash: user2CreateBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;

  const user2LoggedIn: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: user2LoginBody,
    });
  typia.assert(user2LoggedIn);

  TestValidator.equals(
    "User2 authorized and logged in with consistent id",
    user2LoggedIn.id,
    user2Authorized.id,
  );

  // 5. User2 tries to retrieve User1's recurring meal plan and expects error
  await TestValidator.error(
    "User2 unauthorized to access User1's recurring meal plan",
    async () => {
      await api.functional.recipeSharing.regularUser.recurringMealPlans.at(
        connection,
        { recurringMealPlanId: createdRecurringMealPlan.id },
      );
    },
  );
}
