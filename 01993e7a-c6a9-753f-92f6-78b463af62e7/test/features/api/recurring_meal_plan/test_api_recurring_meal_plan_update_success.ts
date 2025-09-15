import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRecurringMealPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecurringMealPlan";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

export async function test_api_recurring_meal_plan_update_success(
  connection: api.IConnection,
) {
  // 1. Regular user registration (join)
  const userCreateBody = {
    email: `${RandomGenerator.name(1).toLowerCase()}@example.com`,
    password_hash: "hashed_password_123",
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const joinedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(joinedUser);

  // 2. Login with the same user
  const loginBody = {
    email: userCreateBody.email,
    password_hash: userCreateBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;

  const loggedInUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);

  // 3. Create a recurring meal plan owned by the authenticated user
  const initialPlanStart = new Date(
    Date.now() + 1000 * 60 * 60 * 24,
  ).toISOString(); // tomorrow
  const initialPlanEnd = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString(); // 30 days later

  const initialPlanCreate = {
    owner_user_id: joinedUser.id,
    name: `Weekly Meal Plan ${RandomGenerator.alphaNumeric(5)}`,
    description: "Initial meal plan description.",
    recurrence_pattern: "weekly",
    start_date: initialPlanStart,
    end_date: initialPlanEnd,
  } satisfies IRecipeSharingRecurringMealPlan.ICreate;

  const createdPlan: IRecipeSharingRecurringMealPlan =
    await api.functional.recipeSharing.regularUser.recurringMealPlans.create(
      connection,
      { body: initialPlanCreate },
    );
  typia.assert(createdPlan);

  // 4. Update the recurring meal plan's details
  const updatePlanStart = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // 1 week from now

  const updatedPlanBody = {
    name: `Monthly Meal Plan ${RandomGenerator.alphaNumeric(5)}`,
    description: "Updated meal plan description.",
    recurrence_pattern: "monthly",
    start_date: updatePlanStart,
    end_date: null, // indefinite plan
  } satisfies IRecipeSharingRecurringMealPlan.IUpdate;

  const updatedPlan: IRecipeSharingRecurringMealPlan =
    await api.functional.recipeSharing.regularUser.recurringMealPlans.update(
      connection,
      {
        recurringMealPlanId: createdPlan.id,
        body: updatedPlanBody,
      },
    );
  typia.assert(updatedPlan);

  // 5. Validate returned updated plan properties
  TestValidator.equals(
    "owner_user_id remains the same",
    updatedPlan.owner_user_id,
    createdPlan.owner_user_id,
  );
  TestValidator.equals(
    "name updated correctly",
    updatedPlan.name,
    updatedPlanBody.name,
  );
  TestValidator.equals(
    "description updated correctly",
    updatedPlan.description,
    updatedPlanBody.description,
  );
  TestValidator.equals(
    "recurrence_pattern updated correctly",
    updatedPlan.recurrence_pattern,
    updatedPlanBody.recurrence_pattern,
  );
  TestValidator.equals(
    "start_date updated correctly",
    updatedPlan.start_date,
    updatedPlanBody.start_date,
  );
  TestValidator.equals(
    "end_date updated correctly",
    updatedPlan.end_date,
    updatedPlanBody.end_date,
  );

  // 6. Validate auditing fields
  TestValidator.predicate(
    "created_at is ISO date",
    typeof updatedPlan.created_at === "string" &&
      updatedPlan.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO date",
    typeof updatedPlan.updated_at === "string" &&
      updatedPlan.updated_at.length > 0,
  );
  TestValidator.equals("deleted_at is null", updatedPlan.deleted_at, null);
}
