import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingMealPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlan";
import type { IRecipeSharingMealPlanEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlanEntry";
import type { IRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipes";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * This test performs a full realistic scenario for updating a meal plan entry.
 * It validates the full workflow including user creation, recipe creation, meal
 * plan creation, entry creation, and finally update with assertions on
 * ownership and data integrity.
 *
 * Steps:
 *
 * 1. Create and authenticate a new regular user.
 * 2. Create a recipe associated with the new user.
 * 3. Create a meal plan owned by the new user.
 * 4. Create a meal plan entry linked to the meal plan and recipe.
 * 5. Update the meal plan entry with new values for quantity, planned date, and
 *    meal slot.
 * 6. Validate update response and check updated properties.
 */
export async function test_api_meal_plan_entry_update_success(
  connection: api.IConnection,
) {
  // Step 1. Create and authenticate a new regular user
  const userBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, { body: userBody });
  typia.assert(user);

  // Step 2. Create a recipe by the user
  const recipeBody = {
    created_by_id: user.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "published",
  } satisfies IRecipeSharingRecipes.ICreate;
  const recipe: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: recipeBody,
    });
  typia.assert(recipe);

  // Step 3. Create a meal plan owned by the user
  const mealPlanBody = {
    owner_user_id: user.id,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IRecipeSharingMealPlan.ICreate;
  const mealPlan: IRecipeSharingMealPlan =
    await api.functional.recipeSharing.regularUser.mealPlans.create(
      connection,
      { body: mealPlanBody },
    );
  typia.assert(mealPlan);

  // Step 4. Create a meal plan entry linked to the meal plan and recipe
  const mealPlanEntryCreateBody = {
    meal_plan_id: mealPlan.id,
    recipe_id: recipe.id,
    quantity: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
    planned_date: new Date(Date.now() + 86400000).toISOString(), // one day later
    meal_slot: RandomGenerator.pick(["breakfast", "lunch", "dinner"] as const),
  } satisfies IRecipeSharingMealPlanEntry.ICreate;
  const mealPlanEntry: IRecipeSharingMealPlanEntry =
    await api.functional.recipeSharing.regularUser.mealPlans.entries.create(
      connection,
      {
        mealPlanId: mealPlan.id,
        body: mealPlanEntryCreateBody,
      },
    );
  typia.assert(mealPlanEntry);

  // Step 5. Update the meal plan entry with new values
  const newQuantity = mealPlanEntry.quantity + 1;
  const newPlannedDate = new Date(Date.now() + 2 * 86400000).toISOString(); // two days later
  const newMealSlot = ["breakfast", "lunch", "dinner"].filter(
    (ms) => ms !== mealPlanEntry.meal_slot,
  )[0];

  const updateBody = {
    quantity: newQuantity,
    planned_date: newPlannedDate,
    meal_slot: newMealSlot,
  } satisfies IRecipeSharingMealPlanEntry.IUpdate;

  const updatedMealPlanEntry: IRecipeSharingMealPlanEntry =
    await api.functional.recipeSharing.regularUser.mealPlans.entries.update(
      connection,
      {
        mealPlanId: mealPlan.id,
        mealPlanEntryId: mealPlanEntry.id,
        body: updateBody,
      },
    );

  typia.assert(updatedMealPlanEntry);

  // Assert that essential IDs remain unchanged
  TestValidator.equals(
    "meal_plan_entry id is unchanged",
    updatedMealPlanEntry.id,
    mealPlanEntry.id,
  );
  TestValidator.equals(
    "meal_plan id is unchanged",
    updatedMealPlanEntry.meal_plan_id,
    mealPlanEntry.meal_plan_id,
  );
  TestValidator.equals(
    "recipe id is unchanged",
    updatedMealPlanEntry.recipe_id,
    mealPlanEntry.recipe_id,
  );

  // Assert that update fields are changed
  TestValidator.notEquals(
    "quantity is updated",
    updatedMealPlanEntry.quantity,
    mealPlanEntry.quantity,
  );
  TestValidator.notEquals(
    "planned_date is updated",
    updatedMealPlanEntry.planned_date,
    mealPlanEntry.planned_date,
  );
  TestValidator.notEquals(
    "meal_slot is updated",
    updatedMealPlanEntry.meal_slot,
    mealPlanEntry.meal_slot,
  );

  // Assert timestamps are updated and consistent
  TestValidator.predicate(
    "updated_at is newer or equal",
    new Date(updatedMealPlanEntry.updated_at).getTime() >=
      new Date(mealPlanEntry.updated_at).getTime(),
  );
  TestValidator.equals(
    "created_at is unchanged",
    updatedMealPlanEntry.created_at,
    mealPlanEntry.created_at,
  );
}
