import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementNotification";
import type { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";

/**
 * This scenario tests the notification listing operation for PM role users. It
 * covers retrieving a paginated and filtered list of notifications relevant to
 * the PM user.
 *
 * Workflow:
 *
 * 1. Register a new Project Manager (PM) user with unique credentials via
 *    /auth/pm/join.
 * 2. Login as the PM user via /auth/pm/login to obtain authentication.
 * 3. Using authenticated PM connection, call the PATCH
 *    /taskManagement/pm/notifications endpoint with various filter criteria
 *    including notification type and read status, with pagination.
 * 4. Validate returned notifications belong only to the authenticated PM user,
 *    match filter criteria, and pagination metadata reflects proper totals.
 * 5. Test edge cases like empty results and invalid pagination parameters.
 * 6. Test unauthorized access returns error.
 *
 * Business rules:
 *
 * - PM users only see their notifications.
 * - Pagination and filtering works as specified.
 * - Unauthorized access is forbidden.
 */
export async function test_api_notification_index_pm_with_filter_pagination(
  connection: api.IConnection,
) {
  // 1. Create a unique PM user with email, password, and name
  const pmCreateBody = {
    email: `pm_${Date.now()}@example.com`,
    password: "P@ssw0rd123",
    name: "Project Manager",
  } satisfies ITaskManagementPm.ICreate;

  // Call join API
  const pmAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, {
      body: pmCreateBody,
    });
  typia.assert(pmAuthorized);

  // 2. Login as the PM user
  const pmLoginBody = {
    email: pmCreateBody.email,
    password: pmCreateBody.password,
  } satisfies ITaskManagementPm.ILogin;

  const pmLoginAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, {
      body: pmLoginBody,
    });
  typia.assert(pmLoginAuthorized);

  // 3. Prepare filters for notifications
  const notificationTypes = [
    "assignment",
    "status_change",
    "comment",
    "general",
  ] as const;

  // 4. Paginate and filter notifications by notification_type and is_read
  for (const type of notificationTypes) {
    for (const isRead of [true, false]) {
      // Request body for notification_filter
      const filterRequestBody = {
        notification_type: type,
        is_read: isRead,
        page: 1,
        limit: 10,
      } satisfies ITaskManagementNotification.IRequest;

      const notificationPage: IPageITaskManagementNotification.ISummary =
        await api.functional.taskManagement.pm.notifications.index(connection, {
          body: filterRequestBody,
        });
      typia.assert(notificationPage);

      // Validate all notifications belong to logged-in PM user
      for (const notification of notificationPage.data) {
        TestValidator.equals(
          "notification user_id matches logged-in PM user",
          notification.user_id,
          pmLoginAuthorized.id,
        );
        TestValidator.equals(
          "notification type matches filter",
          notification.notification_type,
          type,
        );
        TestValidator.equals(
          "notification is_read matches filter",
          notification.is_read,
          isRead,
        );
      }

      // Validate pagination numbers
      const { pagination } = notificationPage;
      TestValidator.predicate(
        "pagination current page valid",
        pagination.current >= 0,
      );
      TestValidator.predicate("pagination limit valid", pagination.limit >= 0);
      TestValidator.predicate(
        "pagination records valid",
        pagination.records >= 0,
      );
      TestValidator.predicate("pagination pages valid", pagination.pages >= 0);

      // pages should be ceil(records / limit) if limit > 0
      if (pagination.limit > 0) {
        const expectedPages = Math.ceil(pagination.records / pagination.limit);
        TestValidator.equals(
          "pagination pages consistent",
          pagination.pages,
          expectedPages,
        );
      }
    }
  }

  // 5. Test empty result sets by filtering with a rare type "non_existent_type"
  const emptyFilterRequest = {
    notification_type: "non_existent_type",
    page: 1,
    limit: 10,
  } satisfies ITaskManagementNotification.IRequest;

  const emptyResult: IPageITaskManagementNotification.ISummary =
    await api.functional.taskManagement.pm.notifications.index(connection, {
      body: emptyFilterRequest,
    });
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty filter returns 0 records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty filter returns 0 pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty filter returns empty data array",
    emptyResult.data.length,
    0,
  );

  // 6. Test invalid pagination parameters handled gracefully
  const invalidPaginationRequests: ITaskManagementNotification.IRequest[] = [
    { page: -1, limit: 10 },
    { page: 1, limit: -5 },
    { page: null, limit: 0 },
    { page: 0, limit: null },
  ];

  for (const invalidRequest of invalidPaginationRequests) {
    // Include required properties with explicit null or valid defaults
    const req = {
      page:
        invalidRequest.page === null
          ? null
          : invalidRequest.page === undefined
            ? 1
            : invalidRequest.page,
      limit:
        invalidRequest.limit === null
          ? null
          : invalidRequest.limit === undefined
            ? 10
            : invalidRequest.limit,
    } satisfies ITaskManagementNotification.IRequest;

    const response = await api.functional.taskManagement.pm.notifications.index(
      connection,
      {
        body: req,
      },
    );
    typia.assert(response);
    // Pagination fields must be non-negative
    TestValidator.predicate(
      "pagination current page non-negative",
      response.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination limit non-negative",
      response.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination records non-negative",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages non-negative",
      response.pagination.pages >= 0,
    );
  }

  // 7. Test unauthorized access returns error
  // Create unauthenticated connection (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthorized access throws error", async () => {
    await api.functional.taskManagement.pm.notifications.index(unauthConn, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITaskManagementNotification.IRequest,
    });
  });
}
