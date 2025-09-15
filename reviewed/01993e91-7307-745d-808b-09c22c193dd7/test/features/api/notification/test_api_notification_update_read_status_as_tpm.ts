import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * Scenario Overview: This scenario tests that a TPM user can update
 * notification properties, such as marking a notification as read.
 *
 * Workflow:
 *
 * 1. Register a TPM user using POST /auth/tpm/join with valid credentials.
 * 2. Authenticate the TPM user via POST /auth/tpm/login to get JWT tokens.
 * 3. Retrieve or create a notification for the TPM user.
 * 4. Send a PUT /taskManagement/tpm/notifications/{id} request with updated
 *    notification fields like is_read set to true.
 *
 * Validation:
 *
 * - Verify successful registration and login return JWT tokens.
 * - Confirm update accepts valid fields and returns updated notification data.
 * - Ensure that only authorized TPM users can update their notifications.
 *
 * Business Logic:
 *
 * - Updating read status causes notification to be marked as read with updated
 *   timestamp.
 * - Restrictions prevent non-owners from updating notifications.
 *
 * Success Criteria:
 *
 * - Response includes updated notification data with changes applied.
 * - Unauthorized update attempts are rejected.
 *
 * Error Handling:
 *
 * - Invalid notification IDs return 404 errors.
 * - Requests without valid authentication return 401 errors.
 */
export async function test_api_notification_update_read_status_as_tpm(
  connection: api.IConnection,
) {
  // 1. Join a new TPM user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "pass1234",
    name: "John Doe",
  } satisfies ITaskManagementTpm.IJoin;
  const joinedUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.join(connection, { body: joinBody });
  typia.assert(joinedUser);

  // 2. Login the same TPM user
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ITaskManagementTpm.ILogin;
  const loggedInUser: ITaskManagementTpm.IAuthorized =
    await api.functional.auth.tpm.login(connection, { body: loginBody });
  typia.assert(loggedInUser);

  // 3. Prepare a notification to update
  // Since no explicit creation endpoint, we simulate or reuse returned notification from update response
  // Use typia to generate a random notification id for update, but use the user id from logged in user
  const notificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const updateBody = {
    is_read: true,
    read_at: new Date().toISOString(),
  } satisfies ITaskManagementNotification.IUpdate;

  // 4. Update the notification read status
  const updatedNotification: ITaskManagementNotification =
    await api.functional.taskManagement.tpm.notifications.update(connection, {
      id: notificationId,
      body: updateBody,
    });
  typia.assert(updatedNotification);
  // Check that the updated notification has is_read true
  TestValidator.equals(
    "Notification is_read should be true",
    updatedNotification.is_read,
    true,
  );
  // The read_at timestamp should match the update body
  TestValidator.equals(
    "Notification read_at should be updated",
    updatedNotification.read_at,
    updateBody.read_at,
  );

  // 5. Error case: invalid notification id returns 404 (simulate by using invalid UUID)
  const invalidNotificationId: string & tags.Format<"uuid"> =
    "00000000-0000-0000-0000-000000000000" satisfies string &
      tags.Format<"uuid">;
  await TestValidator.error(
    "Updating notification with invalid id should throw",
    async () => {
      await api.functional.taskManagement.tpm.notifications.update(connection, {
        id: invalidNotificationId,
        body: updateBody,
      });
    },
  );

  // 6. Error case: updating notification without authentication returns 401
  // Create new connection without authentication headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "Unauthorized update attempt should throw",
    async () => {
      await api.functional.taskManagement.tpm.notifications.update(
        unauthenticatedConnection,
        { id: notificationId, body: updateBody },
      );
    },
  );
}
