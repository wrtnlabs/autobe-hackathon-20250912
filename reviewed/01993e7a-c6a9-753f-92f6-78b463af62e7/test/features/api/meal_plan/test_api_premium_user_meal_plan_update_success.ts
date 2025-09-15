import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingMealPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlan";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";

export async function test_api_premium_user_meal_plan_update_success(
  connection: api.IConnection,
) {
  // 1. Create premium user account
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const passwordHash = RandomGenerator.alphaNumeric(60); // simulated bcrypt hash length

  const user: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: {
        email,
        password_hash: passwordHash,
        username,
      } satisfies IRecipeSharingPremiumUser.ICreate,
    });
  typia.assert(user);

  // 2. Create a meal plan for the premium user
  const initialMealPlanName = RandomGenerator.paragraph({ sentences: 3 });
  const initialMealPlanDescription = RandomGenerator.content({ paragraphs: 1 });

  const mealPlan: IRecipeSharingMealPlan =
    await api.functional.recipeSharing.premiumUser.mealPlans.create(
      connection,
      {
        body: {
          owner_user_id: user.id,
          name: initialMealPlanName,
          description: initialMealPlanDescription,
        } satisfies IRecipeSharingMealPlan.ICreate,
      },
    );
  typia.assert(mealPlan);

  // 3. Update the meal plan name and description
  const updatedMealPlanName = RandomGenerator.paragraph({ sentences: 4 });
  const updatedMealPlanDescription = RandomGenerator.content({ paragraphs: 2 });

  const updatedMealPlan: IRecipeSharingMealPlan =
    await api.functional.recipeSharing.premiumUser.mealPlans.update(
      connection,
      {
        mealPlanId: mealPlan.id,
        body: {
          name: updatedMealPlanName,
          description: updatedMealPlanDescription,
        } satisfies IRecipeSharingMealPlan.IUpdate,
      },
    );
  typia.assert(updatedMealPlan);

  // 4. Verify updates are reflected
  TestValidator.equals(
    "updated meal plan name matches",
    updatedMealPlan.name,
    updatedMealPlanName,
  );
  TestValidator.equals(
    "updated meal plan description matches",
    updatedMealPlan.description,
    updatedMealPlanDescription,
  );
}
