import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementNotification";
import type { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";

/**
 * End-to-end test validating notification listing for QA users.
 *
 * This test registers and authenticates a QA user, then repeatedly queries the
 * notifications endpoint with various filter and pagination parameters.
 * Validations include confirmation that only the authenticated users
 * notifications are returned, pagination metadata correctness, correct
 * filtering by notification type and read status, handling of empty results,
 * and error scenarios for unauthenticated requests.
 *
 * The test ensures strict type safety by verifying responses with typia.assert,
 * uses randomized realistic data for user creation, and enforces descriptive
 * test validation messages with TestValidator helper utilities.
 *
 * Workflow:
 *
 * 1. Create QA user via /auth/qa/join.
 * 2. Login QA user via /auth/qa/login.
 * 3. Query /taskManagement/qa/notifications with various filters.
 * 4. Validate returned notifications belong to user, filters and pagination act as
 *    expected.
 * 5. Test error responses for unauthorized access.
 */
export async function test_api_notification_index_list_for_qa_user(
  connection: api.IConnection,
) {
  // 1. Generate plain password to be used both for join and login
  const plainPassword = RandomGenerator.alphaNumeric(12);

  // 2. Register a new QA user with password_hash as the plain password
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: plainPassword, // Simulate hashing
    name: RandomGenerator.name(),
  } satisfies ITaskManagementQa.ICreate;

  const authorizedUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, { body: joinBody });
  typia.assert(authorizedUser);

  // 3. Login the QA user with email and plain password
  const loginBody = {
    email: joinBody.email,
    password: plainPassword,
  } satisfies ITaskManagementQa.ILogin;

  const loggedInUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.login(connection, { body: loginBody });
  typia.assert(loggedInUser);

  // Verify email consistency
  TestValidator.equals(
    "QA user email after login",
    loggedInUser.email,
    joinBody.email,
  );

  // 4. Prepare various notification request bodies for filtering and pagination
  const notificationRequestBodies: Array<ITaskManagementNotification.IRequest> =
    [];

  // Basic no filter
  notificationRequestBodies.push({});

  // Pagination variations
  notificationRequestBodies.push({ page: 1, limit: 5 });
  notificationRequestBodies.push({ page: 2, limit: 2 });
  notificationRequestBodies.push({ page: 1, limit: 10 });
  notificationRequestBodies.push({ page: 3, limit: 3 });

  // Filter by notification_type
  notificationRequestBodies.push({ notification_type: "assignment" });
  notificationRequestBodies.push({ notification_type: "status_change" });

  // Filter by read status
  notificationRequestBodies.push({ is_read: true });
  notificationRequestBodies.push({ is_read: false });

  // Combined filter notification_type and is_read
  notificationRequestBodies.push({
    notification_type: "comment",
    is_read: false,
  });

  // Unlikely notification_type to test empty results
  notificationRequestBodies.push({
    notification_type: "non_existing_notification_type",
  });

  // 5. Test each filter and pagination scenario
  for (const [index, body] of notificationRequestBodies.entries()) {
    const response: IPageITaskManagementNotification.ISummary =
      await api.functional.taskManagement.qa.notifications.index(connection, {
        body,
      });
    typia.assert(response);

    // Validate pagination metadata
    TestValidator.predicate(
      `pagination current page non-negative for request index ${index}`,
      response.pagination.current >= 0,
    );
    TestValidator.predicate(
      `pagination limit positive for request index ${index}`,
      response.pagination.limit > 0,
    );
    TestValidator.predicate(
      `pagination pages non-negative for request index ${index}`,
      response.pagination.pages >= 0,
    );
    TestValidator.predicate(
      `pagination records non-negative for request index ${index}`,
      response.pagination.records >= 0,
    );

    // Validate all notifications belong to logged-in user
    for (const notification of response.data) {
      TestValidator.equals(
        `notification user_id matches logged-in user for request index ${index}`,
        notification.user_id,
        loggedInUser.id,
      );

      if (
        body.notification_type !== null &&
        body.notification_type !== undefined
      ) {
        TestValidator.equals(
          `notification_type matches filter for request index ${index}`,
          notification.notification_type,
          body.notification_type,
        );
      }

      if (body.is_read !== null && body.is_read !== undefined) {
        TestValidator.equals(
          `is_read matches filter for request index ${index}`,
          notification.is_read,
          body.is_read,
        );
      }
    }

    // Validate empty data array as empty properly
    if (response.data.length === 0) {
      TestValidator.equals(
        `empty notification list matches filter for request index ${index}`,
        response.data,
        [],
      );
    }
  }

  // 6. Test unauthorized access returns error
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.taskManagement.qa.notifications.index(
      unauthConnection,
      { body: {} },
    );
  });
}
