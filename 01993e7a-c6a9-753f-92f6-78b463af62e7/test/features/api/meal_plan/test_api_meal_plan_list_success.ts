import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingMealPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingMealPlans";
import type { IRecipeSharingMealPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlan";
import type { IRecipeSharingMealPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlans";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * This test validates the full workflow of a regular user joining the
 * recipe sharing platform, creating a meal plan owned by them, and then
 * retrieving the list of meal plans filtered by their ownership with
 * pagination.
 *
 * It confirms that meal plans retrieval supports correct filtering by
 * owner_user_id, pagination parameters, and returns valid results with
 * proper pagination metadata and data structures.
 *
 * Steps:
 *
 * 1. Join as a regular user and authenticate
 * 2. Create a meal plan for this user
 * 3. Query meal plans list with pagination and owner_user_id filter
 * 4. Assert the returned meal plans belong to the created user
 * 5. Confirm pagination info is consistent with expectations
 *
 * This scenario tests the business logic correctness as well as the API
 * contract correctness for the meal plan listing endpoint.
 */
export async function test_api_meal_plan_list_success(
  connection: api.IConnection,
) {
  // Step 1: Regular user joins the platform and authenticates
  const userCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // Step 2: Create a meal plan owned by the authenticated user
  const mealPlanCreateBody = {
    owner_user_id: authorizedUser.id,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 2,
      sentenceMax: 4,
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

  // Step 3: Query meal plans list filtered by owner_user_id with pagination
  const mealPlanListRequest = {
    owner_user_id: authorizedUser.id,
    page: 1 satisfies number,
    limit: 10 satisfies number,
  } satisfies IRecipeSharingMealPlans.IRequest;

  const paginatedMealPlans: IPageIRecipeSharingMealPlans.ISummary =
    await api.functional.recipeSharing.regularUser.mealPlans.searchMealPlans(
      connection,
      {
        body: mealPlanListRequest,
      },
    );
  typia.assert(paginatedMealPlans);

  // Step 4: Assert that at least one meal plan is returned and meal plan id matches created meal plan
  TestValidator.predicate(
    "meal plans data must contain the created meal plan",
    ArrayUtil.has(
      paginatedMealPlans.data,
      (mp) => mp.id === createdMealPlan.id,
    ),
  );

  // Step 5: Confirm pagination metadata consistency
  TestValidator.predicate(
    "pagination current page is 1",
    paginatedMealPlans.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is at most 10",
    paginatedMealPlans.pagination.limit <= 10,
  );
  TestValidator.predicate(
    "pagination records >= data length",
    paginatedMealPlans.pagination.records >= paginatedMealPlans.data.length,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    paginatedMealPlans.pagination.pages >= 1,
  );
}
