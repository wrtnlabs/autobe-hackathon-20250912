import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingMealPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlan";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";

export async function test_api_meal_plan_create_success_and_authentication(
  connection: api.IConnection,
) {
  // Step 1. Create a premium user to get authentication context
  const premiumUserCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(60),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingPremiumUser.ICreate;
  const premiumUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: premiumUserCreateBody,
    });
  typia.assert(premiumUser);
  // Step 2. Prepare meal plan creation body using created user ID
  const mealPlanCreateBody = {
    owner_user_id: premiumUser.id,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IRecipeSharingMealPlan.ICreate;
  // Step 3. Create meal plan with authenticated connection
  const mealPlan: IRecipeSharingMealPlan =
    await api.functional.recipeSharing.premiumUser.mealPlans.create(
      connection,
      {
        body: mealPlanCreateBody,
      },
    );
  typia.assert(mealPlan);
  // Step 4. Validate meal plan fields
  TestValidator.equals(
    "owner_user_id matches premium user id",
    mealPlan.owner_user_id,
    premiumUser.id,
  );
  TestValidator.equals(
    "meal plan name matches request",
    mealPlan.name,
    mealPlanCreateBody.name,
  );
  if (
    mealPlanCreateBody.description === null ||
    mealPlanCreateBody.description === undefined
  ) {
    TestValidator.predicate(
      "meal plan description is null or undefined",
      mealPlan.description === null || mealPlan.description === undefined,
    );
  } else {
    TestValidator.equals(
      "meal plan description matches request",
      mealPlan.description,
      mealPlanCreateBody.description,
    );
  }
  TestValidator.predicate(
    "meal plan id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      mealPlan.id,
    ),
  );
  TestValidator.predicate(
    "created_at is non-empty string",
    typeof mealPlan.created_at === "string" && mealPlan.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is non-empty string",
    typeof mealPlan.updated_at === "string" && mealPlan.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at is null or undefined",
    mealPlan.deleted_at === null || mealPlan.deleted_at === undefined,
  );
  // Step 5. Test unauthorized meal plan creation
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized creation without token should fail",
    async () => {
      await api.functional.recipeSharing.premiumUser.mealPlans.create(
        unauthenticatedConnection,
        {
          body: mealPlanCreateBody,
        },
      );
    },
  );
}
