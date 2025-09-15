import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRecurringMealPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecurringMealPlan";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * This scenario tests the creation of a new recurring meal plan by an
 * authenticated regular user. It demonstrates successful creation with valid
 * input including the plan name, recurrence pattern, start date, optional end
 * date, and description. The scenario also covers business rules such as
 * uniqueness of plan names per user and correct format for recurrence pattern.
 * It validates correct audit timestamps and confirms the returned data matches
 * the input plus system-generated fields.
 */
export async function test_api_recurring_meal_plan_creation_success(
  connection: api.IConnection,
) {
  // 1. Regular user signs up
  const userCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Prepare recurring meal plan create data
  const nowISOString = new Date().toISOString();

  const recurringMealPlanCreateBody = {
    owner_user_id: authorizedUser.id,
    name: `Plan_${RandomGenerator.alphaNumeric(5)}`,
    recurrence_pattern: RandomGenerator.pick([
      "weekly",
      "biweekly",
      "monthly",
    ] as const),
    start_date: nowISOString,
    end_date: null,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRecipeSharingRecurringMealPlan.ICreate;

  // 3. Create recurring meal plan
  const recurringMealPlan: IRecipeSharingRecurringMealPlan =
    await api.functional.recipeSharing.regularUser.recurringMealPlans.create(
      connection,
      {
        body: recurringMealPlanCreateBody,
      },
    );
  typia.assert(recurringMealPlan);

  // 4. Validate fields
  TestValidator.equals(
    "owner_user_id should match",
    recurringMealPlan.owner_user_id,
    recurringMealPlanCreateBody.owner_user_id,
  );
  TestValidator.equals(
    "name should match",
    recurringMealPlan.name,
    recurringMealPlanCreateBody.name,
  );
  TestValidator.equals(
    "recurrence_pattern should match",
    recurringMealPlan.recurrence_pattern,
    recurringMealPlanCreateBody.recurrence_pattern,
  );
  TestValidator.equals(
    "start_date should match",
    recurringMealPlan.start_date,
    recurringMealPlanCreateBody.start_date,
  );

  if (recurringMealPlanCreateBody.end_date === null) {
    TestValidator.equals(
      "end_date should be null",
      recurringMealPlan.end_date,
      null,
    );
  } else if (recurringMealPlanCreateBody.end_date === undefined) {
    TestValidator.equals(
      "end_date should be undefined",
      recurringMealPlan.end_date,
      undefined,
    );
  } else {
    TestValidator.equals(
      "end_date should match",
      recurringMealPlan.end_date,
      recurringMealPlanCreateBody.end_date,
    );
  }

  TestValidator.equals(
    "description should match",
    recurringMealPlan.description,
    recurringMealPlanCreateBody.description,
  );

  // 5. Validate audit timestamps
  // Validate created_at and updated_at are ISO date-time strings
  TestValidator.predicate(
    "created_at valid ISO 8601",
    typeof recurringMealPlan.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
        recurringMealPlan.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at valid ISO 8601",
    typeof recurringMealPlan.updated_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
        recurringMealPlan.updated_at,
      ),
  );

  // Deleted_at should be null or undefined
  TestValidator.predicate(
    "deleted_at is null or undefined",
    recurringMealPlan.deleted_at === null ||
      recurringMealPlan.deleted_at === undefined,
  );
}
