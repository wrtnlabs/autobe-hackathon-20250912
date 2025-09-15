import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingMealPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlan";
import type { IRecipeSharingMealPlanEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlanEntry";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test retrieval of detailed information for a specific meal plan entry by
 * mealPlanId and mealPlanEntryId.
 *
 * This test covers the entire workflow from creating a regular user,
 * authenticating that user, creating a meal plan owned by the authenticated
 * user, adding a meal plan entry to that meal plan, and finally retrieving
 * the meal plan entry details by mealPlanId and mealPlanEntryId.
 *
 * It verifies that:
 *
 * - The regular user can successfully join and authenticate.
 * - Meal plans can be created and belong to the authenticated user.
 * - Meal plan entries can be created under the meal plan.
 * - Retrieval of meal plan entry details returns correct data and respects
 *   ownership.
 *
 * The test uses realistic random data for inputs and validates API
 * responses with typia.assert. It also verifies that the retrieved meal
 * plan entry matches the created entry.
 */
export async function test_api_meal_plan_entry_details_successful_retrieval(
  connection: api.IConnection,
) {
  // 1. Create regular user and authenticate
  const createUserBody = {
    email: RandomGenerator.alphaNumeric(6) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const regularUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: createUserBody,
    });
  typia.assert(regularUser);

  // 2. Create meal plan for authenticated user
  const createMealPlanBody = {
    owner_user_id: regularUser.id,
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRecipeSharingMealPlan.ICreate;

  const mealPlan: IRecipeSharingMealPlan =
    await api.functional.recipeSharing.regularUser.mealPlans.create(
      connection,
      {
        body: createMealPlanBody,
      },
    );
  typia.assert(mealPlan);

  // 3. Create a meal plan entry under the meal plan
  const createEntryBody = {
    meal_plan_id: mealPlan.id,
    recipe_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    planned_date: new Date().toISOString(),
    meal_slot: RandomGenerator.pick(["breakfast", "lunch", "dinner"] as const),
  } satisfies IRecipeSharingMealPlanEntry.ICreate;

  const mealPlanEntry: IRecipeSharingMealPlanEntry =
    await api.functional.recipeSharing.regularUser.mealPlans.entries.create(
      connection,
      {
        mealPlanId: mealPlan.id,
        body: createEntryBody,
      },
    );
  typia.assert(mealPlanEntry);

  // 4. Retrieve the meal plan entry details
  const retrievedEntry: IRecipeSharingMealPlanEntry =
    await api.functional.recipeSharing.regularUser.mealPlans.entries.at(
      connection,
      {
        mealPlanId: mealPlan.id,
        mealPlanEntryId: mealPlanEntry.id,
      },
    );
  typia.assert(retrievedEntry);

  // 5. Validate that retrieved entry matches the created entry
  TestValidator.equals(
    "retrieved meal plan entry matches created entry",
    retrievedEntry.id,
    mealPlanEntry.id,
  );
  TestValidator.equals(
    "retrieved meal plan id matches created meal plan id",
    retrievedEntry.meal_plan_id,
    mealPlanEntry.meal_plan_id,
  );
  TestValidator.equals(
    "retrieved recipe id matches created recipe id",
    retrievedEntry.recipe_id,
    mealPlanEntry.recipe_id,
  );
  TestValidator.equals(
    "retrieved quantity matches created quantity",
    retrievedEntry.quantity,
    mealPlanEntry.quantity,
  );
  TestValidator.equals(
    "retrieved planned date matches created planned date",
    retrievedEntry.planned_date,
    mealPlanEntry.planned_date,
  );
  TestValidator.equals(
    "retrieved meal slot matches created meal slot",
    retrievedEntry.meal_slot,
    mealPlanEntry.meal_slot,
  );
}
