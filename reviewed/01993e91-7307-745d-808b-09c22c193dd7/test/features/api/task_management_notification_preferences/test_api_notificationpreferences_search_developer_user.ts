import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementNotificationPreferences";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";

/**
 * Test scenario focusing on developer role users performing searches and
 * retrievals of their notification preferences with filtering and pagination.
 * The workflow includes creating and authenticating a developer user, followed
 * by creation of notification preferences with various keys and delivery
 * methods. Test the ability to paginate and filter preferences effectively.
 * Validate that only authenticated developer users can access their preferences
 * and that unauthorized requests are rejected. Include tests for boundary
 * conditions like empty results and invalid filter parameters. Confirm that
 * returned notification preference data aligns with user's input and schema.
 * This ensures comprehensive coverage of notification preference search
 * features for the developer user base.
 */
export async function test_api_notificationpreferences_search_developer_user(
  connection: api.IConnection,
) {
  // 1. Developer user registration (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementDeveloper.ICreate;

  const developer: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, { body: joinBody });
  typia.assert(developer);

  // 2. Developer user login
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password_hash, // using password_hash as password for test
  } satisfies ITaskManagementDeveloper.ILogin;

  const developerLogin: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, { body: loginBody });
  typia.assert(developerLogin);

  TestValidator.equals(
    "Logged developer user id match",
    developerLogin.id,
    developer.id,
  );

  // 3. Test searching preferences with no filters
  const prefsAll: IPageITaskManagementNotificationPreferences =
    await api.functional.taskManagement.developer.notificationPreferences.indexNotificationPreferences(
      connection,
      { body: {} satisfies ITaskManagementNotificationPreferences.IRequest },
    );
  typia.assert(prefsAll);

  TestValidator.predicate(
    "Returned preferences all belong to developer",
    prefsAll.data.every((pref) => pref.user_id === developer.id),
  );

  // 4. Test filtering by preference_key and delivery_method with pagination
  const preferenceKeys = ["assignment", "status_change", "comment"] as const;
  const deliveryMethods = ["email", "push", "sms"] as const;

  for (const preference_key of preferenceKeys) {
    for (const delivery_method of deliveryMethods) {
      const filteredPage: IPageITaskManagementNotificationPreferences =
        await api.functional.taskManagement.developer.notificationPreferences.indexNotificationPreferences(
          connection,
          {
            body: {
              preference_key: preference_key,
              delivery_method: delivery_method,
              page: 1,
              limit: 3,
            } satisfies ITaskManagementNotificationPreferences.IRequest,
          },
        );
      typia.assert(filteredPage);

      TestValidator.predicate(
        "Page number is 1",
        filteredPage.pagination.current === 1,
      );
      TestValidator.predicate(
        "Limit in pagination is 3",
        filteredPage.pagination.limit === 3,
      );

      TestValidator.predicate(
        "All returned preferences match preference_key",
        filteredPage.data.every((d) => d.preference_key === preference_key),
      );
      TestValidator.predicate(
        "All returned preferences match delivery_method",
        filteredPage.data.every((d) => d.delivery_method === delivery_method),
      );
      TestValidator.predicate(
        "All returned preferences belong to developer",
        filteredPage.data.every((d) => d.user_id === developer.id),
      );
    }
  }

  // 5. Test filtering by enabled status
  for (const enabled of [true, false]) {
    const enabledFiltered: IPageITaskManagementNotificationPreferences =
      await api.functional.taskManagement.developer.notificationPreferences.indexNotificationPreferences(
        connection,
        {
          body: {
            enabled: enabled,
            page: 1,
            limit: 5,
          } satisfies ITaskManagementNotificationPreferences.IRequest,
        },
      );
    typia.assert(enabledFiltered);

    TestValidator.predicate(
      "All returned preferences have enabled status",
      enabledFiltered.data.every((d) => d.enabled === enabled),
    );
    TestValidator.predicate(
      "All returned preferences belong to developer",
      enabledFiltered.data.every((d) => d.user_id === developer.id),
    );
  }

  // 6. Test pagination boundary condition: high page number yields empty data
  const emptyPage: IPageITaskManagementNotificationPreferences =
    await api.functional.taskManagement.developer.notificationPreferences.indexNotificationPreferences(
      connection,
      {
        body: {
          page: 999999,
          limit: 10,
        } satisfies ITaskManagementNotificationPreferences.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("Empty page data length", emptyPage.data.length, 0);
}
