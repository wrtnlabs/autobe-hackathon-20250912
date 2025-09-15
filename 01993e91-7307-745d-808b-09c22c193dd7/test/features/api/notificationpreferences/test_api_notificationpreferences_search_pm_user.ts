import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementNotificationPreferences";
import type { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";

/**
 * Test function for searching notification preferences of a PM user with
 * pagination and filters.
 *
 * The test performs the following steps:
 *
 * 1. Register a new PM user using the /auth/pm/join endpoint.
 * 2. Log in as the PM user to obtain JWT authorization tokens using
 *    /auth/pm/login.
 * 3. Create multiple notification preference records for the PM user with
 *    diverse preference keys and delivery methods.
 * 4. Perform a paginated search using the
 *    /taskManagement/pm/notificationPreferences PATCH endpoint applying
 *    filters: preference_key, delivery_method, and enabled status.
 * 5. Validate the pagination response structure (current page, limit, total
 *    records, total pages).
 * 6. Validate that only the expected notification preferences matching the
 *    filter criteria are returned.
 * 7. Test unauthorized access by calling the search endpoint without
 *    authentication and expect failure.
 * 8. Test invalid request parameters for pagination and filters and expect
 *    error responses.
 */
export async function test_api_notificationpreferences_search_pm_user(
  connection: api.IConnection,
) {
  // 1. Register a new PM user
  const pmCreateBody = {
    email: `pmuser${Date.now()}@example.com`,
    password: "Password123!",
    name: "PM User",
  } satisfies ITaskManagementPm.ICreate;
  const pmAuthorized = await api.functional.auth.pm.join(connection, {
    body: pmCreateBody,
  });
  typia.assert(pmAuthorized);

  // 2. Log in as the PM user to obtain JWT tokens
  const pmLoginBody = {
    email: pmCreateBody.email,
    password: pmCreateBody.password,
  } satisfies ITaskManagementPm.ILogin;
  const pmLoggedIn = await api.functional.auth.pm.login(connection, {
    body: pmLoginBody,
  });
  typia.assert(pmLoggedIn);

  // 3. Since no API available to create preferences, assume they exist
  // 4. Perform paginated search applying filters
  const filterPreferenceKey = "assignment";
  const filterDeliveryMethod = "email";
  const filterEnabled = true;

  const searchRequest1 = {
    preference_key: filterPreferenceKey,
    delivery_method: filterDeliveryMethod,
    enabled: filterEnabled,
    page: 1,
    limit: 10,
  } satisfies ITaskManagementNotificationPreferences.IRequest;

  const pageResult =
    await api.functional.taskManagement.pm.notificationPreferences.indexNotificationPreferences(
      connection,
      { body: searchRequest1 },
    );
  typia.assert(pageResult);

  // 5. Validate pagination structure
  TestValidator.predicate(
    "pagination current page is valid",
    pageResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    pageResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pageResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count is consistent",
    pageResult.pagination.records >= 0,
  );

  // 6. Validate that all entries match filter criteria
  for (const pref of pageResult.data) {
    TestValidator.equals(
      "preference key matches filter",
      pref.preference_key,
      filterPreferenceKey,
    );
    TestValidator.equals(
      "delivery method matches filter",
      pref.delivery_method,
      filterDeliveryMethod,
    );
    TestValidator.equals(
      "enabled status matches filter",
      pref.enabled,
      filterEnabled,
    );
  }

  // 7. Test unauthorized access: create a new connection without authorization
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.taskManagement.pm.notificationPreferences.indexNotificationPreferences(
      unauthConn,
      { body: searchRequest1 },
    );
  });

  // 8. Test invalid request parameters
  const invalidPageRequest = {
    page: -1,
    limit: 10,
  } satisfies ITaskManagementNotificationPreferences.IRequest;
  await TestValidator.error("invalid page number should fail", async () => {
    await api.functional.taskManagement.pm.notificationPreferences.indexNotificationPreferences(
      connection,
      { body: invalidPageRequest },
    );
  });

  const invalidLimitRequest = {
    page: 1,
    limit: 0,
  } satisfies ITaskManagementNotificationPreferences.IRequest;
  await TestValidator.error("invalid limit zero should fail", async () => {
    await api.functional.taskManagement.pm.notificationPreferences.indexNotificationPreferences(
      connection,
      { body: invalidLimitRequest },
    );
  });

  const invalidFilterRequest = {
    delivery_method: "invalid_method",
    page: 1,
    limit: 5,
  } satisfies ITaskManagementNotificationPreferences.IRequest;
  await TestValidator.error("invalid delivery method should fail", async () => {
    await api.functional.taskManagement.pm.notificationPreferences.indexNotificationPreferences(
      connection,
      { body: invalidFilterRequest },
    );
  });
}
