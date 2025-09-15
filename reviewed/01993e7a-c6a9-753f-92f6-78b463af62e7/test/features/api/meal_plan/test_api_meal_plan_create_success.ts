import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingMealPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlan";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * This end-to-end test validates the successful creation of a meal plan by a
 * newly created regular user. It first creates a new regular user to obtain an
 * authenticated context, then creates a meal plan owned by that user. The test
 * ensures strict compliance with schema required properties, validates UUID and
 * date-time formats, and confirms the ownership of the created meal plan
 * matches the authorized user.
 */
export async function test_api_meal_plan_create_success(
  connection: api.IConnection,
) {
  // 1. Create a new regular user (join)
  const newUserCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(24),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: newUserCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Create meal plan owned by new user
  const mealPlanCreateBody = {
    owner_user_id: authorizedUser.id,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: null,
  } satisfies IRecipeSharingMealPlan.ICreate;

  const mealPlan: IRecipeSharingMealPlan =
    await api.functional.recipeSharing.regularUser.mealPlans.create(
      connection,
      {
        body: mealPlanCreateBody,
      },
    );
  typia.assert(mealPlan);

  // 3. Validate meal plan response
  TestValidator.predicate(
    "meal plan ID is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      mealPlan.id,
    ),
  );
  TestValidator.equals(
    "meal plan owner matches authorized user",
    mealPlan.owner_user_id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "meal plan name matches",
    mealPlan.name,
    mealPlanCreateBody.name,
  );
  TestValidator.predicate(
    "created_at is ISO date string",
    typeof mealPlan.created_at === "string" &&
      !Number.isNaN(Date.parse(mealPlan.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO date string",
    typeof mealPlan.updated_at === "string" &&
      !Number.isNaN(Date.parse(mealPlan.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    mealPlan.deleted_at ?? null,
    null,
  );
}
