import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementNotificationPreferences";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";

/**
 * This end-to-end test validates the authenticated designer user's ability to
 * search notification preferences using the PATCH
 * /taskManagement/designer/notificationPreferences endpoint with various
 * filters and pagination.
 *
 * It performs the following steps:
 *
 * 1. Registers a new designer user with a randomly generated email, password, and
 *    name.
 * 2. Logs in the same designer user with the same password to obtain
 *    authentication tokens.
 * 3. Executes multiple search queries with combinations of preference_key,
 *    delivery_method, enabled filters, and pagination parameters page and
 *    limit.
 * 4. For each search response, validates pagination details and asserts that all
 *    returned data match the filter criteria.
 * 5. Tests unauthorized access by making a request without authentication and
 *    expects an error.
 *
 * This verifies access control, filtering correctness, pagination integrity,
 * and response structure for the notification preferences API.
 */
export async function test_api_notificationpreferences_search_designer_user(
  connection: api.IConnection,
) {
  // Step 1: Register a new designer user using a consistent plaintext password
  const password = RandomGenerator.alphaNumeric(16);
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: password,
    name: RandomGenerator.name(),
  } satisfies ITaskManagementDesigner.ICreate;

  const joinedDesigner = await api.functional.auth.designer.join(connection, {
    body: joinBody,
  });
  typia.assert(joinedDesigner);

  // Step 2: Login as the same registered designer user with the plaintext password
  const loginBody = {
    email: joinBody.email,
    password: password,
  } satisfies ITaskManagementDesigner.ILogin;

  const loggedInDesigner = await api.functional.auth.designer.login(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(loggedInDesigner);

  // Step 3: Test notification preference search with varied filters and pagination
  const preferenceKeys = ["assignment", "status_change", "comment"] as const;
  const deliveryMethods = ["email", "push", "sms"] as const;

  for (const preferenceKey of preferenceKeys) {
    for (const deliveryMethod of deliveryMethods) {
      for (const enabled of [true, false]) {
        const page = RandomGenerator.pick([1, 2, 3]);
        const limit = RandomGenerator.pick([5, 10, 20]);

        const response =
          await api.functional.taskManagement.designer.notificationPreferences.indexNotificationPreferences(
            connection,
            {
              body: {
                preference_key: preferenceKey,
                delivery_method: deliveryMethod,
                enabled: enabled,
                page: page,
                limit: limit,
              } satisfies ITaskManagementNotificationPreferences.IRequest,
            },
          );
        typia.assert(response);

        // Validate pagination
        TestValidator.predicate(
          `pagination current page should be ${page}`,
          response.pagination.current === page,
        );
        TestValidator.predicate(
          `pagination limit should be ${limit}`,
          response.pagination.limit === limit,
        );
        TestValidator.predicate(
          "pagination pages should be >= 1",
          response.pagination.pages >= 1,
        );
        TestValidator.predicate(
          "pagination records should be >= 0",
          response.pagination.records >= 0,
        );
        TestValidator.predicate(
          "pagination current page not exceed total pages",
          response.pagination.current <= response.pagination.pages,
        );

        // Validate each data entry matches filters
        for (const preference of response.data) {
          TestValidator.equals(
            "preference_key matches filter",
            preference.preference_key,
            preferenceKey,
          );
          TestValidator.equals(
            "delivery_method matches filter",
            preference.delivery_method,
            deliveryMethod,
          );
          TestValidator.equals(
            "enabled matches filter",
            preference.enabled,
            enabled,
          );
          TestValidator.predicate(
            "preference id is valid UUID",
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
              preference.id,
            ),
          );
          TestValidator.predicate(
            "user_id is valid UUID",
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
              preference.user_id,
            ),
          );
        }
      }
    }
  }

  // Step 4: Test unauthorized access and expect failure
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "access without authorization should fail",
    async () => {
      await api.functional.taskManagement.designer.notificationPreferences.indexNotificationPreferences(
        unauthorizedConnection,
        { body: {} satisfies ITaskManagementNotificationPreferences.IRequest },
      );
    },
  );
}
