import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingMealPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlan";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";

export async function test_api_meal_plan_delete_by_premium_user_success_and_authorization(
  connection: api.IConnection,
) {
  // 1. Create and authenticate the first premium user (User A)
  const userAEmail: string = typia.random<string & tags.Format<"email">>();
  const userA: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: {
        email: userAEmail,
        password_hash: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.name(2),
      } satisfies IRecipeSharingPremiumUser.ICreate,
    });
  typia.assert(userA);

  // 2. Create a meal plan for User A
  const mealPlanCreateBody: IRecipeSharingMealPlan.ICreate = {
    owner_user_id: userA.id,
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  };

  const mealPlan: IRecipeSharingMealPlan =
    await api.functional.recipeSharing.premiumUser.mealPlans.create(
      connection,
      {
        body: mealPlanCreateBody satisfies IRecipeSharingMealPlan.ICreate,
      },
    );
  typia.assert(mealPlan);

  TestValidator.equals(
    "Owner user ID matches",
    mealPlan.owner_user_id,
    userA.id,
  );
  TestValidator.equals(
    "Meal plan name matches",
    mealPlan.name,
    mealPlanCreateBody.name,
  );

  // 3. Delete the meal plan as User A
  await api.functional.recipeSharing.premiumUser.mealPlans.erase(connection, {
    mealPlanId: mealPlan.id,
  });

  // 4. Create and authenticate a second premium user (User B)
  const userBEmail: string = typia.random<string & tags.Format<"email">>();
  const userB: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: {
        email: userBEmail,
        password_hash: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.name(2),
      } satisfies IRecipeSharingPremiumUser.ICreate,
    });
  typia.assert(userB);

  // 5. Attempt to delete User A's meal plan as User B - expect an error due to authorization
  await TestValidator.error(
    "Unauthorized user cannot delete another's meal plan",
    async () => {
      await api.functional.recipeSharing.premiumUser.mealPlans.erase(
        connection,
        {
          mealPlanId: mealPlan.id,
        },
      );
    },
  );
}
