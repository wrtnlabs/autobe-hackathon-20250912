import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingMealPlanEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingMealPlanEntry";
import type { IRecipeSharingMealPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlan";
import type { IRecipeSharingMealPlanEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlanEntry";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Test listing meal plan entries for an authenticated regular user
 *
 * This test covers the full scenario where a new regular user is created
 * and authenticated, a meal plan is created for that user, and then the
 * entries for that meal plan are listed via the paginated entries
 * endpoint.
 *
 * The test validates:
 *
 * - Successful user creation and authentication
 * - Meal plan creation associated with the authenticated user
 * - Retrieval of paginated meal plan entries with correct ownership
 * - Pagination metadata correctness
 * - All returned entries belong to the requested meal plan
 *
 * This test demonstrates proper handling of authentication context, input
 * data preparation with realistic random values, and response validation
 * using typia.assert and TestValidator predicates.
 *
 * Steps:
 *
 * 1. Create and authenticate regular user
 * 2. Create meal plan for the user
 * 3. Retrieve list of meal plan entries with valid mealPlanId
 * 4. Verify pagination info and entry ownership
 */
export async function test_api_meal_plan_entries_listing_with_valid_authentication_and_valid_mealplanid(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a regular user via join
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Using authenticated user, create a meal plan
  const mealPlanCreateBody = {
    owner_user_id: authorizedUser.id,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 4,
      wordMin: 4,
      wordMax: 8,
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

  // 3. Fetch meal plan entries for the created mealPlan.id
  const mealPlanEntriesResponse: IPageIRecipeSharingMealPlanEntry =
    await api.functional.recipeSharing.regularUser.mealPlans.entries.index(
      connection,
      {
        mealPlanId: mealPlan.id,
      },
    );
  typia.assert(mealPlanEntriesResponse);

  // 4. Assertions on pagination
  TestValidator.predicate(
    "pagination current page should be a non-negative int",
    Number.isInteger(mealPlanEntriesResponse.pagination.current) &&
      mealPlanEntriesResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be a non-negative int",
    Number.isInteger(mealPlanEntriesResponse.pagination.limit) &&
      mealPlanEntriesResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count should be a non-negative int",
    Number.isInteger(mealPlanEntriesResponse.pagination.records) &&
      mealPlanEntriesResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count should be a non-negative int",
    Number.isInteger(mealPlanEntriesResponse.pagination.pages) &&
      mealPlanEntriesResponse.pagination.pages >= 0,
  );

  // 5. Validate each meal plan entry belongs to the requested mealPlanId
  for (const entry of mealPlanEntriesResponse.data) {
    TestValidator.equals(
      "meal plan entry meal_plan_id should match the queried meal plan id",
      entry.meal_plan_id,
      mealPlan.id,
    );
  }
}
