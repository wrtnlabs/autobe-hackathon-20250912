import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementNotification";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import type { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";

/**
 * E2E test for developer notification list retrieval with filter and
 * pagination.
 *
 * Tests developer user registration, login, and notification querying with
 * various filters and pagination parameters.
 */
export async function test_api_notification_index_developer_with_filter_pagination(
  connection: api.IConnection,
) {
  // Register developer user
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const passwordPlain = "password1234";
  const passwordHash = passwordPlain; // For testing, using plain as hash

  const joinBody = {
    email: email,
    password_hash: passwordHash,
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementDeveloper.ICreate;

  const developer: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, { body: joinBody });
  typia.assert(developer);

  // Login developer user to refresh token and set auth header
  const loginBody = {
    email: email,
    password: passwordPlain,
  } satisfies ITaskManagementDeveloper.ILogin;

  const loggedInDeveloper: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, { body: loginBody });
  typia.assert(loggedInDeveloper);

  // The token is now set on connection.headers by SDK

  // Define helper function to validate that notifications belong to the developer
  function validateNotifications(
    notifications: ITaskManagementNotification.ISummary[],
    userId: string,
    notificationTypeFilter: string | null | undefined,
    isReadFilter: boolean | null | undefined,
  ) {
    notifications.forEach((notification) => {
      TestValidator.equals(
        "notification user_id matches logged-in developer",
        notification.user_id,
        userId,
      );
      if (
        notificationTypeFilter !== null &&
        notificationTypeFilter !== undefined
      ) {
        TestValidator.equals(
          "notification type matches filter",
          notification.notification_type,
          notificationTypeFilter,
        );
      }
      if (isReadFilter !== null && isReadFilter !== undefined) {
        TestValidator.equals(
          "notification is_read matches filter",
          notification.is_read,
          isReadFilter,
        );
      }
    });
  }

  // Test 1: Fetch notifications without filters (default)
  {
    const body: ITaskManagementNotification.IRequest = {};

    const page: IPageITaskManagementNotification.ISummary =
      await api.functional.taskManagement.developer.notifications.index(
        connection,
        { body: body },
      );
    typia.assert(page);

    // All notifications belong to this developer
    validateNotifications(page.data, developer.id, null, null);

    TestValidator.predicate(
      `pagination current and limit are positive`,
      page.pagination.current > 0 && page.pagination.limit > 0,
    );
  }

  // Test 2: Filter by notification_type
  {
    const filterType = "assignment";
    const body: ITaskManagementNotification.IRequest = {
      notification_type: filterType,
    };

    const page =
      await api.functional.taskManagement.developer.notifications.index(
        connection,
        { body: body },
      );
    typia.assert(page);

    validateNotifications(page.data, developer.id, filterType, null);
  }

  // Test 3: Filter by is_read flag
  {
    const isReadFilter = false;
    const body: ITaskManagementNotification.IRequest = {
      is_read: isReadFilter,
    };

    const page =
      await api.functional.taskManagement.developer.notifications.index(
        connection,
        { body: body },
      );
    typia.assert(page);

    validateNotifications(page.data, developer.id, null, isReadFilter);
  }

  // Test 4: Filter by notification_type and is_read combined
  {
    const filterType = "comment";
    const isReadFilter = true;
    const body: ITaskManagementNotification.IRequest = {
      notification_type: filterType,
      is_read: isReadFilter,
    };

    const page =
      await api.functional.taskManagement.developer.notifications.index(
        connection,
        { body: body },
      );
    typia.assert(page);

    validateNotifications(page.data, developer.id, filterType, isReadFilter);
  }

  // Test 5: Pagination test - limit and page
  {
    const body: ITaskManagementNotification.IRequest = {
      limit: 3,
      page: 1,
    };

    const page1 =
      await api.functional.taskManagement.developer.notifications.index(
        connection,
        { body: body },
      );
    typia.assert(page1);

    TestValidator.equals(
      "pagination limit correct",
      page1.pagination.limit,
      body.limit!,
    );
    TestValidator.equals(
      "pagination current page correct",
      page1.pagination.current,
      body.page!,
    );

    if (page1.pagination.pages > 1) {
      const nextPageBody: ITaskManagementNotification.IRequest = {
        limit: 3,
        page: 2,
      };

      const page2 =
        await api.functional.taskManagement.developer.notifications.index(
          connection,
          { body: nextPageBody },
        );
      typia.assert(page2);

      // Page 2 data should differ or be empty
      TestValidator.predicate(
        "page 2 data differs or empty",
        page2.data.length === 0 ||
          JSON.stringify(page2.data) !== JSON.stringify(page1.data),
      );
    }
  }

  // Test 6: Unauthorized request (without authentication)
  {
    const unauthenticatedConnection: api.IConnection = {
      ...connection,
      headers: {},
    };
    const body: ITaskManagementNotification.IRequest = {};

    await TestValidator.error("unauthorized access should fail", async () => {
      await api.functional.taskManagement.developer.notifications.index(
        unauthenticatedConnection,
        { body },
      );
    });
  }
}
