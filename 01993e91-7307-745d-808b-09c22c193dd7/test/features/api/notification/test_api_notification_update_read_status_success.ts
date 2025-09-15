import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";

/**
 * Comprehensive end-to-end test validating the successful update of the
 * read status of a QA user's notification, including both success and
 * failure scenarios.
 *
 * This test executes the following steps:
 *
 * 1. Register a new QA user and authenticate to obtain JWT tokens
 * 2. Ensure the existence of at least one notification for the QA user; if
 *    none present, simulate one using the update API in simulation mode
 * 3. Update the selected notification's is_read flag to true and set read_at
 *    to the current ISO 8601 timestamp
 * 4. Assert that the notification's read status updates correctly and
 *    typia.assert confirms type validity
 * 5. Test failure scenarios including unauthorized update attempts, invalid
 *    notification IDs, and invalid update payloads
 * 6. Use TestValidator to validate all assertions and error conditions with
 *    descriptive titles
 *
 * The test respects all DTO and API constraints, uses proper async/await,
 * and avoids unauthorized header manipulations. It uses the API SDK
 * functions and DTO types precisely as specified.
 */
export async function test_api_notification_update_read_status_success(
  connection: api.IConnection,
) {
  // 1. Register a new QA user
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SafeP@ssw0rd!";
  const name = RandomGenerator.name();

  const qaUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, {
      body: {
        email,
        password_hash: password,
        name,
      } satisfies ITaskManagementQa.ICreate,
    });
  typia.assert(qaUser);

  // 2. Login as the QA user to get fresh auth and JWT tokens set in connection
  const loginUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.login(connection, {
      body: {
        email,
        password,
      } satisfies ITaskManagementQa.ILogin,
    });
  typia.assert(loginUser);

  // 3. Prepare a notification to update
  // Since no create notification API, we'll use update in simulation to get random notification ID

  let notification: ITaskManagementNotification | null = null;
  // Attempt simulation mode update to get a valid notification
  notification = await api.functional.taskManagement.qa.notifications.update(
    { ...connection, simulate: true },
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: {
        is_read: false,
        read_at: null,
      } satisfies ITaskManagementNotification.IUpdate,
    },
  );
  typia.assert(notification);

  // 4. Update the notification's is_read to true and set read_at to current ISO datetime
  const currentISO = new Date().toISOString();

  const updatedNotification =
    await api.functional.taskManagement.qa.notifications.update(connection, {
      id: notification.id,
      body: {
        is_read: true,
        read_at: currentISO,
      } satisfies ITaskManagementNotification.IUpdate,
    });
  typia.assert(updatedNotification);

  TestValidator.equals(
    "notification id matches after update",
    updatedNotification.id,
    notification.id,
  );
  TestValidator.equals(
    "notification user_id consistency",
    updatedNotification.user_id,
    notification.user_id,
  );
  TestValidator.equals(
    "notification is_read should be true",
    updatedNotification.is_read,
    true,
  );
  TestValidator.equals(
    "notification read_at matches updated timestamp",
    updatedNotification.read_at,
    currentISO,
  );

  // 5. Negative test: unauthorized update attempt
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized update should fail", async () => {
    await api.functional.taskManagement.qa.notifications.update(
      unauthenticatedConnection,
      {
        id: notification.id,
        body: {
          is_read: false,
          read_at: null,
        } satisfies ITaskManagementNotification.IUpdate,
      },
    );
  });

  // 6. Negative test: invalid notification ID format (malformed UUID)
  await TestValidator.error(
    "update with invalid UUID format should fail",
    async () => {
      await api.functional.taskManagement.qa.notifications.update(connection, {
        id: "invalid-uuid-string",
        body: {
          is_read: true,
          read_at: currentISO,
        } satisfies ITaskManagementNotification.IUpdate,
      });
    },
  );

  // 7. Negative test: update non-existent valid UUID (random UUID unlikely to exist)
  const nonExistentUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update non-existent notification should fail",
    async () => {
      await api.functional.taskManagement.qa.notifications.update(connection, {
        id: nonExistentUUID,
        body: {
          is_read: true,
          read_at: currentISO,
        } satisfies ITaskManagementNotification.IUpdate,
      });
    },
  );

  // 8. Negative test: invalid payload - inconsistency perhaps is_read false but read_at non-null
  await TestValidator.error(
    "update with inconsistent payload should fail",
    async () => {
      await api.functional.taskManagement.qa.notifications.update(connection, {
        id: notification.id,
        body: {
          is_read: false,
          read_at: currentISO, // read_at non-null when is_read is false
        } satisfies ITaskManagementNotification.IUpdate,
      });
    },
  );
}
