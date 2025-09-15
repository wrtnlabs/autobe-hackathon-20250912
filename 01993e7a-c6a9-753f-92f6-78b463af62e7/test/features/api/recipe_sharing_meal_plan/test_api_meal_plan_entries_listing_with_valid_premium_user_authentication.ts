import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingMealPlanEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingMealPlanEntry";
import type { IRecipeSharingMealPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlan";
import type { IRecipeSharingMealPlanEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingMealPlanEntry";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";

/**
 * This test validates the retrieval of meal plan entries by an authenticated
 * premium user.
 *
 * Workflow:
 *
 * 1. Register a premium user with unique email, username, and password hash.
 * 2. Confirm authorization and token receipt on join operation.
 * 3. Create a meal plan owned by the authenticated premium user.
 * 4. Fetch meal plan entries using PATCH
 *    /recipeSharing/premiumUser/mealPlans/{mealPlanId}/entries.
 * 5. Assert that the meal plan entries correspond to the created meal plan.
 * 6. Validate pagination metadata for correctness.
 * 7. Ensure all UUIDs, datetimes, and other fields conform to expected formats.
 *
 * This tests access control, ownership of resources, data structure conformity,
 * and pagination correctness for premium user endpoints.
 */
export async function test_api_meal_plan_entries_listing_with_valid_premium_user_authentication(
  connection: api.IConnection,
) {
  // 1. Register premium user
  const premiumUserEmail = `user_${RandomGenerator.alphaNumeric(6)}@testing.com`;
  const premiumUserPasswordHash = RandomGenerator.alphaNumeric(44); // Simulated password hash
  const premiumUserName = RandomGenerator.name();

  const premiumUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: {
        email: premiumUserEmail,
        password_hash: premiumUserPasswordHash,
        username: premiumUserName,
      } satisfies IRecipeSharingPremiumUser.ICreate,
    });
  typia.assert(premiumUser);

  // Expect premiumUser.id matches uuid format
  TestValidator.predicate(
    "premiumUser.id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      premiumUser.id,
    ),
  );

  // 2. Create meal plan
  const mealPlan: IRecipeSharingMealPlan =
    await api.functional.recipeSharing.premiumUser.mealPlans.create(
      connection,
      {
        body: {
          owner_user_id: premiumUser.id,
          name: `Meal Plan ${RandomGenerator.alphaNumeric(5)}`,
          description: `Description ${RandomGenerator.paragraph({ sentences: 4 })}`,
        } satisfies IRecipeSharingMealPlan.ICreate,
      },
    );
  typia.assert(mealPlan);
  TestValidator.equals(
    "mealPlan.owner_user_id matches premiumUser.id",
    mealPlan.owner_user_id,
    premiumUser.id,
  );

  // 3. Request meal plan entries
  const entriesPage: IPageIRecipeSharingMealPlanEntry =
    await api.functional.recipeSharing.premiumUser.mealPlans.entries.index(
      connection,
      { mealPlanId: mealPlan.id },
    );
  typia.assert(entriesPage);

  // 4. Validate pagination object properties
  TestValidator.predicate(
    "pagination.current is non-negative integer",
    Number.isInteger(entriesPage.pagination.current) &&
      entriesPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative integer",
    Number.isInteger(entriesPage.pagination.limit) &&
      entriesPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative integer",
    Number.isInteger(entriesPage.pagination.records) &&
      entriesPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative integer",
    Number.isInteger(entriesPage.pagination.pages) &&
      entriesPage.pagination.pages >= 0,
  );

  // 5. Validate each entry's meal_plan_id matches mealPlan.id
  entriesPage.data.forEach((entry, index) => {
    typia.assert(entry);
    TestValidator.equals(
      `entry[${index}].meal_plan_id matches mealPlan.id`,
      entry.meal_plan_id,
      mealPlan.id,
    );
  });

  // 6. Optional: Validate date-time format of each entry's planned_date
  entriesPage.data.forEach((entry) => {
    TestValidator.predicate(
      "planned_date is valid ISO 8601 date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(entry.planned_date),
    );
  });

  // 7. Validate array length consistency with pagination limit
  TestValidator.predicate(
    "entries count is less or equal to pagination limit",
    entriesPage.data.length <= entriesPage.pagination.limit,
  );
}
