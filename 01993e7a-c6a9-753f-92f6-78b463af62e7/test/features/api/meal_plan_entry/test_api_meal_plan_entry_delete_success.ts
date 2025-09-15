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
 * Test deleting an existing meal plan entry successfully.
 *
 * This test performs the following steps to verify deletion:
 *
 * 1. Register a new regular user and authenticate.
 * 2. Create a new recipe under this user.
 * 3. Create a new meal plan owned by the user.
 * 4. Create a meal plan entry in the meal plan for the created recipe.
 * 5. Delete the created meal plan entry successfully.
 * 6. Verify deletion by attempting to delete again and expecting an error.
 */
export async function test_api_meal_plan_entry_delete_success(
  connection: api.IConnection,
) {
  // 1. Register a new regular user
  const userCreate = {
    email: `${RandomGenerator.alphabets(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreate,
    });
  typia.assert(user);

  // 2. Create a new recipe for this user
  const recipeCreate = {
    created_by_id: user.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
      wordMin: 4,
      wordMax: 7,
    }),
    status: "draft",
  } satisfies IRecipeSharingRecipes.ICreate;
  const recipe: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: recipeCreate,
    });
  typia.assert(recipe);

  // 3. Create a new meal plan owned by the user
  const mealPlanCreate = {
    owner_user_id: user.id,
    name: `Plan ${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRecipeSharingMealPlan.ICreate;
  const mealPlan: IRecipeSharingMealPlan =
    await api.functional.recipeSharing.regularUser.mealPlans.create(
      connection,
      {
        body: mealPlanCreate,
      },
    );
  typia.assert(mealPlan);

  // 4. Create a meal plan entry in the meal plan for the recipe
  const mealPlanEntryCreate = {
    meal_plan_id: mealPlan.id,
    recipe_id: recipe.id,
    quantity: 2,
    planned_date: new Date().toISOString(),
    meal_slot: "dinner",
  } satisfies IRecipeSharingMealPlanEntry.ICreate;
  const mealPlanEntry: IRecipeSharingMealPlanEntry =
    await api.functional.recipeSharing.regularUser.mealPlans.entries.create(
      connection,
      {
        mealPlanId: mealPlan.id,
        body: mealPlanEntryCreate,
      },
    );
  typia.assert(mealPlanEntry);

  // 5. Delete the meal plan entry successfully
  await api.functional.recipeSharing.regularUser.mealPlans.entries.erase(
    connection,
    {
      mealPlanId: mealPlan.id,
      mealPlanEntryId: mealPlanEntry.id,
    },
  );

  // 6. Attempt to delete again - expecting error
  await TestValidator.error(
    "deleting non-existent meal plan entry should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.mealPlans.entries.erase(
        connection,
        {
          mealPlanId: mealPlan.id,
          mealPlanEntryId: mealPlanEntry.id,
        },
      );
    },
  );
}
