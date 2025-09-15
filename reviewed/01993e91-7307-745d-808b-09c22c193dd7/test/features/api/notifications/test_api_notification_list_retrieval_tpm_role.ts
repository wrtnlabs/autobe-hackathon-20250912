import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementNotification";
import type { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This test validates the retrieval of a filtered, paginated notification
 * list for an authenticated TPM user in the task management system.
 *
 * It covers user registration and authentication via /auth/tpm/join,
 * followed by notification retrieval with search filters and pagination
 * using PATCH /taskManagement/tpm/notifications.
 *
 * The test ensures that only the authenticated user's notifications are
 * returned, filtering and pagination work as expected, and error handling
 * is correct for unauthorized or invalid requests.
 */
export async function test_api_notification_list_retrieval_tpm_role(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a TPM user
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies ITaskManagementTpm.IJoin;
  const authorizedUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: joinBody });
  typia.assert(authorizedUser);

  // 2. Prepare valid request body for notifications retrieval filters and pagination
  const validRequestBodies = [
    {
      page: 1,
      limit: 10,
      notification_type: null,
      is_read: null,
      search: null,
    },
    {
      page: 1,
      limit: 5,
      notification_type: "assignment",
      is_read: true,
      search: null,
    },
    {
      page: 2,
      limit: 20,
      notification_type: "status_change",
      is_read: false,
      search: "urgent",
    },
  ] as const;

  for (const requestBody of validRequestBodies) {
    // 3. Retrieve notifications for each valid filter set
    const notificationPage: IPageITaskManagementNotification.ISummary =
      await api.functional.taskManagement.tpm.notifications.index(connection, {
        body: requestBody,
      });
    typia.assert(notificationPage);

    // 4. Validate pagination metadata
    TestValidator.predicate(
      "pagination current page must be >= 0",
      notificationPage.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination limit must be > 0",
      notificationPage.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination pages must be >= 0",
      notificationPage.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination records must be >= 0",
      notificationPage.pagination.records >= 0,
    );

    // 5. Validate each notification summary
    for (const notification of notificationPage.data) {
      typia.assert(notification);
      TestValidator.equals(
        "notification user_id must match authorized user id",
        notification.user_id,
        authorizedUser.id,
      );

      if (requestBody.notification_type !== null) {
        TestValidator.equals(
          "notification_type filter applied",
          notification.notification_type,
          requestBody.notification_type,
        );
      }
      if (requestBody.is_read !== null) {
        TestValidator.equals(
          "is_read filter applied",
          notification.is_read,
          requestBody.is_read,
        );
      }
    }
  }

  // 6. Edge case: search with filters that yields empty result
  const emptySearchBody = {
    page: 1,
    limit: 10,
    notification_type: "nonexistent_type",
    is_read: false,
    search: "unlikely_search_term",
  } satisfies ITaskManagementNotification.IRequest;
  const emptyResult =
    await api.functional.taskManagement.tpm.notifications.index(connection, {
      body: emptySearchBody,
    });
  typia.assert(emptyResult);
  TestValidator.equals("empty result data array", emptyResult.data.length, 0);

  // 7. Unauthorized access tests
  {
    const unauthConn: api.IConnection = { ...connection, headers: {} };
    await TestValidator.error(
      "unauthenticated request should be rejected",
      async () => {
        await api.functional.taskManagement.tpm.notifications.index(
          unauthConn,
          {
            body: {
              page: 1,
              limit: 10,
              notification_type: null,
              is_read: null,
              search: null,
            } satisfies ITaskManagementNotification.IRequest,
          },
        );
      },
    );
  }

  // 8. Invalid filter parameters testing
  {
    // Invalid page (negative number)
    await TestValidator.error(
      "negative page number should produce validation error",
      async () => {
        await api.functional.taskManagement.tpm.notifications.index(
          connection,
          {
            body: {
              page: -1,
              limit: 10,
              notification_type: null,
              is_read: null,
              search: null,
            } satisfies ITaskManagementNotification.IRequest,
          },
        );
      },
    );

    // Invalid limit (zero or negative)
    await TestValidator.error(
      "zero limit should produce validation error",
      async () => {
        await api.functional.taskManagement.tpm.notifications.index(
          connection,
          {
            body: {
              page: 1,
              limit: 0,
              notification_type: null,
              is_read: null,
              search: null,
            } satisfies ITaskManagementNotification.IRequest,
          },
        );
      },
    );
  }
}
