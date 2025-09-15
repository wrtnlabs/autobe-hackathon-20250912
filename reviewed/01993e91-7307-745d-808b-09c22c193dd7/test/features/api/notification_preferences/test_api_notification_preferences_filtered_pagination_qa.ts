import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementNotificationPreferences";
import type { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";

/**
 * Test retrieval of notification preferences with filtering and pagination
 * for a QA user. This scenario covers:
 *
 * 1. Successful retrieval with valid filters and pagination, verifying the
 *    returned page structure and notification preference data accuracy.
 * 2. Authorization enforcement ensuring only authenticated QA users can access
 *    their preferences.
 * 3. Validation of filter parameters and handling of invalid inputs.
 * 4. Expectation that the response contains a correct paginated list that
 *    matches the search criteria. Success is determined by correct paging
 *    and data matching, authorization compliance, and proper error handling
 *    for bad inputs.
 */
export async function test_api_notification_preferences_filtered_pagination_qa(
  connection: api.IConnection,
) {
  // 1. Create and authenticate as QA user by joining
  const createQaBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementQa.ICreate;
  const qaUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, {
      body: createQaBody,
    });
  typia.assert(qaUser);

  // 2. Login as QA user to establish authorization
  const loginBody = {
    email: createQaBody.email,
    password: createQaBody.password_hash,
  } satisfies ITaskManagementQa.ILogin;
  const loginUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.login(connection, {
      body: loginBody,
    });
  typia.assert(loginUser);

  // 3. Prepare valid filter and pagination parameters
  const preferenceKeys = ["assignment", "status_change", "comment"] as const;
  const deliveryMethods = ["email", "push", "sms"] as const;

  const filterBody = {
    preference_key: RandomGenerator.pick(preferenceKeys),
    enabled: RandomGenerator.pick([true, false]),
    delivery_method: RandomGenerator.pick(deliveryMethods),
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies ITaskManagementNotificationPreferences.IRequest;

  // 4. Retrieve filtered and paginated notification preferences
  const pageResult: IPageITaskManagementNotificationPreferences =
    await api.functional.taskManagement.qa.notificationPreferences.indexNotificationPreferences(
      connection,
      { body: filterBody },
    );
  typia.assert(pageResult);

  // 5. Validate pagination info correctness
  TestValidator.predicate(
    "pagination current page is positive",
    pageResult.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    pageResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    pageResult.pagination.pages > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pageResult.pagination.records >= 0,
  );

  // 5.1 Additional pagination logical checks
  TestValidator.predicate(
    "pagination pages consistent with records and limit",
    pageResult.pagination.pages * pageResult.pagination.limit >=
      pageResult.pagination.records,
  );
  TestValidator.predicate(
    "pagination current page not exceeding total pages",
    pageResult.pagination.current <= pageResult.pagination.pages,
  );

  // 6. Validate each notification preference matches filter criteria
  for (const preference of pageResult.data) {
    typia.assert(preference);
    TestValidator.equals(
      "preference_key matches",
      preference.preference_key,
      filterBody.preference_key,
    );
    TestValidator.equals(
      "enabled flag matches",
      preference.enabled,
      filterBody.enabled,
    );
    TestValidator.equals(
      "delivery_method matches",
      preference.delivery_method,
      filterBody.delivery_method,
    );

    // More strict validator for UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    TestValidator.predicate(
      "id is a valid UUID",
      uuidRegex.test(preference.id),
    );
    TestValidator.predicate(
      "user_id is a valid UUID",
      uuidRegex.test(preference.user_id),
    );

    // ISO8601 date-time precise regex with fractional seconds optional
    const isoDateTimeRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/;
    TestValidator.predicate(
      "created_at is ISO8601 date-time",
      isoDateTimeRegex.test(preference.created_at),
    );
    TestValidator.predicate(
      "updated_at is ISO8601 date-time",
      isoDateTimeRegex.test(preference.updated_at),
    );

    if (preference.deleted_at !== null && preference.deleted_at !== undefined) {
      TestValidator.predicate(
        "deleted_at is ISO8601 date-time or null",
        preference.deleted_at === null ||
          isoDateTimeRegex.test(preference.deleted_at),
      );
    }
  }

  // 7. Test authorization enforcement - unauthenticated connection
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access should be denied",
    async () => {
      await api.functional.taskManagement.qa.notificationPreferences.indexNotificationPreferences(
        unauthConnection,
        { body: filterBody },
      );
    },
  );

  // 8. Test validation of invalid filter parameters
  // Use invalid string values instead of null for string filters
  const invalidFilterBodies: ITaskManagementNotificationPreferences.IRequest[] =
    [
      { ...filterBody, preference_key: "invalid_key" },
      { ...filterBody, enabled: null },
      { ...filterBody, delivery_method: "wrong_method" },
      { ...filterBody, page: 0 },
      { ...filterBody, limit: 0 },
      { ...filterBody, limit: 101 },
    ];

  for (const invalidBody of invalidFilterBodies) {
    await TestValidator.error(
      `invalid filter parameter should cause error: ${JSON.stringify(invalidBody)}`,
      async () => {
        await api.functional.taskManagement.qa.notificationPreferences.indexNotificationPreferences(
          connection,
          { body: invalidBody },
        );
      },
    );
  }
}
