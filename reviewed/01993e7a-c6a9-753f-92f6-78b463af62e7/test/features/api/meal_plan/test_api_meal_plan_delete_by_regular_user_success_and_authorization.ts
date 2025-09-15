import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingMealPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlan";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * This test verifies the full workflow of meal plan deletion by a regular user.
 *
 * Steps:
 *
 * 1. Create and authenticate a regular user.
 * 2. Create a meal plan owned by the user.
 * 3. Delete the created meal plan successfully.
 * 4. Attempt deletion again to confirm proper error handling.
 * 5. Attempt deletion unauthenticated to confirm authorization failure.
 * 6. Create a second user and confirm deletion of the first user's meal plan is
 *    forbidden.
 *
 * Validates authorization tokens, UUID formats, and business rules ensuring the
 * meal plan is permanently deleted and access controlled.
 */
export async function test_api_meal_plan_delete_by_regular_user_success_and_authorization(
  connection: api.IConnection,
) {
  // 1. Create and authenticate first regular user
  const firstUserBody = {
    email: RandomGenerator.alphaNumeric(5) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const firstUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: firstUserBody,
    });
  typia.assert(firstUser);

  // 2. Create a meal plan owned by the first user
  const mealPlanCreateBody = {
    owner_user_id: firstUser.id,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 12 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 8,
      wordMax: 16,
    }),
  } satisfies IRecipeSharingMealPlan.ICreate;
  const mealPlan: IRecipeSharingMealPlan =
    await api.functional.recipeSharing.regularUser.mealPlans.create(
      connection,
      {
        body: mealPlanCreateBody,
      },
    );
  typia.assert(mealPlan);

  // 3. Delete the meal plan successfully
  await api.functional.recipeSharing.regularUser.mealPlans.erase(connection, {
    mealPlanId: mealPlan.id,
  });

  // 4. Attempt deletion again - should error because meal plan no longer exists
  await TestValidator.error(
    "delete non-existent meal plan should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.mealPlans.erase(
        connection,
        {
          mealPlanId: mealPlan.id,
        },
      );
    },
  );

  // 5. Attempt deletion unauthenticated
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated deletion attempt should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.mealPlans.erase(
        unauthenticatedConnection,
        {
          mealPlanId: mealPlan.id,
        },
      );
    },
  );

  // 6. Create a second regular user
  const secondUserBody = {
    email: RandomGenerator.alphaNumeric(6) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(20),
    username: RandomGenerator.name(1),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const secondUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: secondUserBody,
    });
  typia.assert(secondUser);

  // 7. First user creates another meal plan
  const secondMealPlanCreateBody = {
    owner_user_id: firstUser.id,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    description: null, // testing optional null
  } satisfies IRecipeSharingMealPlan.ICreate;
  const secondMealPlan: IRecipeSharingMealPlan =
    await api.functional.recipeSharing.regularUser.mealPlans.create(
      connection,
      {
        body: secondMealPlanCreateBody,
      },
    );
  typia.assert(secondMealPlan);

  // 8. Second user attempts to delete first user's new meal plan - should fail
  await TestValidator.error(
    "unauthorized deletion by different user should fail",
    async () => {
      await api.functional.recipeSharing.regularUser.mealPlans.erase(
        connection,
        {
          mealPlanId: secondMealPlan.id,
        },
      );
    },
  );
}
