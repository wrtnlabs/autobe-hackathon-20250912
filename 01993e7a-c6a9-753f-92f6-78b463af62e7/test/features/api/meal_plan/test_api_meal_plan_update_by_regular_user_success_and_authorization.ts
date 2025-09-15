import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingMealPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlan";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test updating an existing meal plan by its ID for a regular user.
 *
 * This test covers the entire flow of a regular user updating their meal
 * plan:
 *
 * 1. Regular user registration and authentication
 * 2. Creation of a meal plan owned by the user
 * 3. Successful update of the meal plan's name and description
 * 4. Validation of updated data correctness
 * 5. Negative test: update attempt without authentication (error expected)
 * 6. Negative test: update attempt with invalid mealPlanId format (error
 *    expected)
 *
 * These steps ensure proper authorization, data integrity, and error
 * handling in the meal plan update API.
 */
export async function test_api_meal_plan_update_by_regular_user_success_and_authorization(
  connection: api.IConnection,
) {
  // 1. Register a new regular user
  const email = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const passwordHash = RandomGenerator.alphaNumeric(16);
  const username = RandomGenerator.name(2);

  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        email,
        password_hash: passwordHash,
        username,
      } satisfies IRecipeSharingRegularUser.ICreate,
    });
  typia.assert(authorizedUser);

  // 2. Create a new meal plan owned by the user
  const mealPlanCreateBody = {
    owner_user_id: authorizedUser.id,
    name: `My Meal Plan ${RandomGenerator.alphaNumeric(4)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRecipeSharingMealPlan.ICreate;

  const createdMealPlan: IRecipeSharingMealPlan =
    await api.functional.recipeSharing.regularUser.mealPlans.create(
      connection,
      {
        body: mealPlanCreateBody,
      },
    );
  typia.assert(createdMealPlan);
  TestValidator.equals(
    "created meal plan owner matches",
    createdMealPlan.owner_user_id,
    authorizedUser.id,
  );

  // 3. Update the meal plan's name and description
  const updatedName = `Updated Meal Plan ${RandomGenerator.alphaNumeric(4)}`;
  const updatedDescription = RandomGenerator.paragraph({ sentences: 7 });

  const updateBody = {
    name: updatedName,
    description: updatedDescription,
  } satisfies IRecipeSharingMealPlan.IUpdate;

  const updatedMealPlan: IRecipeSharingMealPlan =
    await api.functional.recipeSharing.regularUser.mealPlans.update(
      connection,
      {
        mealPlanId: createdMealPlan.id,
        body: updateBody,
      },
    );
  typia.assert(updatedMealPlan);

  // 4. Validate update response
  TestValidator.equals(
    "meal plan id should remain the same",
    updatedMealPlan.id,
    createdMealPlan.id,
  );
  TestValidator.equals(
    "meal plan owner should remain the same",
    updatedMealPlan.owner_user_id,
    createdMealPlan.owner_user_id,
  );
  TestValidator.equals(
    "meal plan name should be updated",
    updatedMealPlan.name,
    updatedName,
  );
  TestValidator.equals(
    "meal plan description should be updated",
    updatedMealPlan.description,
    updatedDescription,
  );

  // 5. Negative test: update without authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("update fails without authentication", async () => {
    await api.functional.recipeSharing.regularUser.mealPlans.update(
      unauthConn,
      {
        mealPlanId: createdMealPlan.id,
        body: updateBody,
      },
    );
  });

  // 6. Negative test: update with invalid mealPlanId format
  await TestValidator.error(
    "update fails with invalid mealPlanId",
    async () => {
      await api.functional.recipeSharing.regularUser.mealPlans.update(
        connection,
        {
          mealPlanId: "invalid-uuid-format",
          body: updateBody,
        },
      );
    },
  );
}
