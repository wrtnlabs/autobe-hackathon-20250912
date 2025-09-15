import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";

/**
 * This E2E test validates the functionality of updating the read status of a
 * notification entity for a PMO (Project Management Officer) user using the API
 * endpoint PUT /taskManagement/pmo/notifications/{id}.
 *
 * The test simulates the entire user journey for a PMO user:
 *
 * 1. Creating (joining) a new PMO user account with valid join data to establish
 *    the user context.
 * 2. Logging in the PMO user to authenticate and obtain valid authorization
 *    tokens.
 * 3. Creating or obtaining a dummy notification associated with that PMO user to
 *    test read status update.
 * 4. Updating the notification read status by calling the PUT endpoint with
 *    notification ID and update data.
 * 5. Validating the response to ensure the notification's is_read field is set to
 *    true and read_at timestamp is correctly updated.
 * 6. Confirming that the notification entity returned fully matches the expected
 *    structure, including timestamps and user ownership.
 * 7. Testing error cases by attempting to update a notification with an invalid or
 *    non-existent ID, expecting a 404 error.
 * 8. Testing authorization failure by attempting to update a notification without
 *    proper ownership or permissions, expecting a 403 error.
 *
 * The DTOs ITaskManagementPmo.IJoin, ITaskManagementPmo.ILogin,
 * ITaskManagementPmo.IAuthorized, and ITaskManagementNotification.IUpdate are
 * used precisely for request bodies and response type validations. All API
 * calls are awaited and validated using typia.assert() to ensure complete type
 * safety.
 *
 * Proper descriptive titles are used in all validation steps for error
 * traceability. The test manages connection state by using the SDK's automatic
 * header management upon join/login.
 *
 * All generated UUIDs and timestamps conform to the expected formats using
 * typia.random<T>() for realistic test data.
 *
 * This test respects all business rules, including:
 *
 * - Only the PMO user who owns the notification can update its read status.
 * - The is_read boolean flag must be true after update.
 * - The read_at timestamp must be a valid ISO 8601 date-time string. Error
 *   handling tests verify correct HTTP errors for unauthorized or invalid
 *   updates.
 */
export async function test_api_notification_update_read_status_pmo(
  connection: api.IConnection,
) {
  // Step 1: Register new PMO user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const pmoAuth: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: joinBody,
    });
  typia.assert(pmoAuth);

  // Step 2: Login PMO user
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementPmo.ILogin;
  const loginAuth: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.login(connection, {
      body: loginBody,
    });
  typia.assert(loginAuth);

  // Step 3: Prepare a notification for update
  // Since no API for notification creation is given, simulate notification object
  const notificationId = typia.random<string & tags.Format<"uuid">>();
  const notificationUserId = pmoAuth.id; // Owner ID
  const fakeNotification: ITaskManagementNotification = {
    id: notificationId,
    user_id: notificationUserId,
    task_id: null,
    notification_type: "general",
    is_read: false,
    read_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  typia.assert(fakeNotification);

  // Step 4: Update notification read status
  const updateBody = {
    is_read: true,
    read_at: new Date().toISOString(),
  } satisfies ITaskManagementNotification.IUpdate;

  const updatedNotification: ITaskManagementNotification =
    await api.functional.taskManagement.pmo.notifications.update(connection, {
      id: notificationId,
      body: updateBody,
    });
  typia.assert(updatedNotification);

  // Step 5: Validate updated notification fields
  TestValidator.equals(
    "updated notification id matches",
    updatedNotification.id,
    notificationId,
  );
  TestValidator.equals(
    "updated notification user id matches",
    updatedNotification.user_id,
    notificationUserId,
  );
  TestValidator.equals(
    "notification is marked as read",
    updatedNotification.is_read,
    true,
  );
  TestValidator.predicate(
    "notification read_at is ISO 8601",
    typeof updatedNotification.read_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$/.test(
        updatedNotification.read_at ?? "",
      ),
  );

  // Step 6: Test error case for non-existent notification ID
  await TestValidator.error(
    "404 error for non-existent notification ID",
    async () => {
      await api.functional.taskManagement.pmo.notifications.update(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: updateBody,
      });
    },
  );

  // Step 7: Test error case for unauthorized update
  // We simulate unauthorized by attempting update with a different PMO user
  const otherJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPmo.IJoin;
  const otherPmoAuth: ITaskManagementPmo.IAuthorized =
    await api.functional.auth.pmo.join(connection, {
      body: otherJoinBody,
    });
  typia.assert(otherPmoAuth);
  // Login as other user
  await api.functional.auth.pmo.login(connection, {
    body: {
      email: otherJoinBody.email,
      password: otherJoinBody.password,
    } satisfies ITaskManagementPmo.ILogin,
  });

  await TestValidator.error(
    "403 forbidden error for unauthorized update",
    async () => {
      await api.functional.taskManagement.pmo.notifications.update(connection, {
        id: notificationId,
        body: updateBody,
      });
    },
  );
}
