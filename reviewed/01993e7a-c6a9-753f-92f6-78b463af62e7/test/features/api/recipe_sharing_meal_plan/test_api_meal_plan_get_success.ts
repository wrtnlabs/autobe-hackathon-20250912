import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingMealPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlan";
import type { IRecipeSharingMealPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlans";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

export async function test_api_meal_plan_get_success(
  connection: api.IConnection,
) {
  // Create a new regular user by calling the /auth/regularUser/join API
  const userCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(64),
    username: RandomGenerator.name(1),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const user: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(user);

  // Create a meal plan owned by the authenticated user
  const mealPlanCreateBody = {
    owner_user_id: user.id,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 3,
      sentenceMax: 5,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IRecipeSharingMealPlan.ICreate;

  const createdMealPlan: IRecipeSharingMealPlan =
    await api.functional.recipeSharing.regularUser.mealPlans.create(
      connection,
      {
        body: mealPlanCreateBody,
      },
    );
  typia.assert(createdMealPlan);

  // Retrieve the meal plan details by ID
  const mealPlanId = createdMealPlan.id;
  typia.assert<string & tags.Format<"uuid">>(mealPlanId);
  const fetchedMealPlan: IRecipeSharingMealPlans =
    await api.functional.recipeSharing.regularUser.mealPlans.atMealPlan(
      connection,
      {
        mealPlanId: mealPlanId,
      },
    );
  typia.assert(fetchedMealPlan);

  // Verify that the retrieved meal plan data matches the created meal plan
  TestValidator.equals(
    "Meal Plan ID should match",
    fetchedMealPlan.id,
    createdMealPlan.id,
  );
  TestValidator.equals(
    "Meal Plan owner_user_id should match",
    fetchedMealPlan.owner_user_id,
    user.id,
  );
  TestValidator.equals(
    "Meal Plan name should match",
    fetchedMealPlan.name,
    mealPlanCreateBody.name,
  );
  TestValidator.equals(
    "Meal Plan description should match",
    fetchedMealPlan.description ?? null,
    mealPlanCreateBody.description ?? null,
  );

  // Verify timestamps and deletion status
  TestValidator.predicate(
    "Meal Plan created_at is non-empty string",
    typeof fetchedMealPlan.created_at === "string" &&
      fetchedMealPlan.created_at.length > 0,
  );
  TestValidator.predicate(
    "Meal Plan updated_at is non-empty string",
    typeof fetchedMealPlan.updated_at === "string" &&
      fetchedMealPlan.updated_at.length > 0,
  );
  // deleted_at can be null, string or undefined (optional)
  TestValidator.predicate(
    "Meal Plan deleted_at is either null or a string or undefined",
    fetchedMealPlan.deleted_at === null ||
      typeof fetchedMealPlan.deleted_at === "string" ||
      fetchedMealPlan.deleted_at === undefined,
  );
}
