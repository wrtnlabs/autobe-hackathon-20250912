import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingMealPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlan";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * This test checks the update operation of an existing meal plan by its
 * mealPlanId for a premium user. It covers the complete scenario from premium
 * user creation and authentication, meal plan creation, update, verification of
 * update persistence, and also tests authorization boundaries by attempting
 * updates from a regular user.
 *
 * The workflow is:
 *
 * 1. Create and login a premium user (owner)
 * 2. Create a meal plan owned by this premium user
 * 3. Update the meal plan's name and description, verify successful update
 * 4. Create and login a different regular user
 * 5. Attempt to update the premium user's meal plan from the regular user and
 *    expect authorization failure
 * 6. Attempt update without token or invalid token and expect failure
 *
 * This ensures correct data integrity, update logic and security constraints
 * for meal plans.
 */
export async function test_api_meal_plan_update_by_premium_user_success_and_authorization(
  connection: api.IConnection,
) {
  // 1. Premium user creation and login
  const premiumUserEmail = typia.random<string & tags.Format<"email">>();
  const premiumUserPasswordHash = RandomGenerator.alphaNumeric(32);
  const premiumUserCreateBody = {
    email: premiumUserEmail,
    password_hash: premiumUserPasswordHash,
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingPremiumUser.ICreate;

  const premiumUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: premiumUserCreateBody,
    });
  typia.assert(premiumUser);

  // 2. Create meal plan owned by premium user
  const mealPlanCreateBody = {
    owner_user_id: premiumUser.id,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRecipeSharingMealPlan.ICreate;

  const mealPlan: IRecipeSharingMealPlan =
    await api.functional.recipeSharing.premiumUser.mealPlans.create(
      connection,
      {
        body: mealPlanCreateBody,
      },
    );
  typia.assert(mealPlan);

  // 3. Update meal plan name and description
  const updatedName = RandomGenerator.paragraph({ sentences: 4 });
  const updatedDescription = RandomGenerator.content({ paragraphs: 1 });
  const mealPlanUpdateBody = {
    name: updatedName,
    description: updatedDescription,
  } satisfies IRecipeSharingMealPlan.IUpdate;

  const updatedMealPlan =
    await api.functional.recipeSharing.regularUser.mealPlans.update(
      connection,
      {
        mealPlanId: mealPlan.id,
        body: mealPlanUpdateBody,
      },
    );
  typia.assert(updatedMealPlan);

  TestValidator.equals(
    "meal plan name updated correctly",
    updatedMealPlan.name,
    updatedName,
  );
  TestValidator.equals(
    "meal plan description updated correctly",
    updatedMealPlan.description,
    updatedDescription,
  );
  TestValidator.equals(
    "meal plan id remains the same",
    updatedMealPlan.id,
    mealPlan.id,
  );
  TestValidator.equals(
    "meal plan owner remains the same",
    updatedMealPlan.owner_user_id,
    mealPlan.owner_user_id,
  );

  // 4. Create and login a different regular user
  const regularUserEmail = typia.random<string>();
  const regularUserPasswordHash = RandomGenerator.alphaNumeric(32);
  const regularUserCreateBody = {
    email: regularUserEmail,
    password_hash: regularUserPasswordHash,
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  await api.functional.auth.regularUser.join(connection, {
    body: regularUserCreateBody,
  });

  await api.functional.auth.regularUser.login(connection, {
    body: {
      email: regularUserEmail,
      password_hash: regularUserPasswordHash,
    } satisfies IRecipeSharingRegularUser.ILogin,
  });

  // 5. Attempt unauthorized update by regular user
  await TestValidator.error(
    "regular user cannot update premium user's meal plan",
    async () => {
      await api.functional.recipeSharing.regularUser.mealPlans.update(
        connection,
        {
          mealPlanId: mealPlan.id,
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: "Unauthorized update attempt",
          } satisfies IRecipeSharingMealPlan.IUpdate,
        },
      );
    },
  );

  // 6. Attempt update with invalid token (simulate by clearing headers)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated cannot update meal plan",
    async () => {
      await api.functional.recipeSharing.regularUser.mealPlans.update(
        unauthenticatedConnection,
        {
          mealPlanId: mealPlan.id,
          body: mealPlanUpdateBody,
        },
      );
    },
  );
}
