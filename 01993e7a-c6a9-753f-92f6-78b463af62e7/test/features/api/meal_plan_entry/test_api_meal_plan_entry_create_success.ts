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
 * Test creating a new meal plan entry successfully for a regular user.
 *
 * This E2E test covers the full workflow of:
 *
 * 1. Registering a new regular user.
 * 2. Creating a recipe owned by the user.
 * 3. Creating a meal plan owned by the same user.
 * 4. Creating a meal plan entry that links the recipe with the meal plan.
 *
 * Each step validates that the returned data conforms to expected types and
 * properties using typia.assert(), and that data linkages are correct using
 * TestValidator. The test ensures the meal plan entry has correct
 * references and valid fields such as quantity, planned date, and meal
 * slot.
 */
export async function test_api_meal_plan_entry_create_success(
  connection: api.IConnection,
) {
  // 1. Register new regular user
  const newUserBody = {
    email: `user${RandomGenerator.alphaNumeric(5)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(20),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: newUserBody,
    });
  typia.assert(user);

  // 2. Create a new recipe by the registered user
  const newRecipeBody = {
    created_by_id: user.id,
    title: `${RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 })} #${RandomGenerator.alphaNumeric(3)}`,
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    status: "published",
  } satisfies IRecipeSharingRecipes.ICreate;

  const recipe: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: newRecipeBody,
    });
  typia.assert(recipe);
  TestValidator.equals(
    "recipe created_by_id matches user id",
    recipe.created_by_id,
    user.id,
  );

  // 3. Create a meal plan for the user
  const newMealPlanBody = {
    owner_user_id: user.id,
    name: `Meal Plan ${RandomGenerator.alphaNumeric(5)}`,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IRecipeSharingMealPlan.ICreate;

  const mealPlan: IRecipeSharingMealPlan =
    await api.functional.recipeSharing.regularUser.mealPlans.create(
      connection,
      { body: newMealPlanBody },
    );
  typia.assert(mealPlan);
  TestValidator.equals(
    "mealPlan owner_user_id matches user id",
    mealPlan.owner_user_id,
    user.id,
  );

  // 4. Create a meal plan entry associating the recipe with the meal plan
  const nowISOString = new Date().toISOString();
  const newMealPlanEntryBody = {
    meal_plan_id: mealPlan.id,
    recipe_id: recipe.id,
    quantity: (typia.random<string>()!.charCodeAt(0) % 10) + 1, // quantity between 1 and 10
    planned_date: nowISOString,
    meal_slot: "breakfast",
  } satisfies IRecipeSharingMealPlanEntry.ICreate;

  const mealPlanEntry: IRecipeSharingMealPlanEntry =
    await api.functional.recipeSharing.regularUser.mealPlans.entries.create(
      connection,
      {
        mealPlanId: mealPlan.id,
        body: newMealPlanEntryBody,
      },
    );
  typia.assert(mealPlanEntry);
  TestValidator.equals(
    "mealPlanEntry meal_plan_id matches mealPlan id",
    mealPlanEntry.meal_plan_id,
    mealPlan.id,
  );
  TestValidator.equals(
    "mealPlanEntry recipe_id matches recipe id",
    mealPlanEntry.recipe_id,
    recipe.id,
  );
  TestValidator.predicate(
    "mealPlanEntry quantity positive",
    mealPlanEntry.quantity > 0,
  );
  TestValidator.equals(
    "mealPlanEntry planned_date matches input",
    mealPlanEntry.planned_date,
    nowISOString,
  );
  TestValidator.equals(
    "mealPlanEntry meal_slot matches input",
    mealPlanEntry.meal_slot,
    "breakfast",
  );
}
