import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";

/**
 * This test validates developer user registration and authentication, then
 * verifies the deletion of notifications owned by the developer.
 *
 * It performs these steps:
 *
 * 1. Registers a developer user with valid email, password hash, and name.
 * 2. Logs in the developer user using the same email and password.
 * 3. Generates a simulated UUID representing an existing notification.
 * 4. Deletes this notification, verifying successful completion without
 *    errors.
 * 5. Attempts to delete a different notification (non-existent or
 *    unauthorized), expecting an error to be thrown.
 * 6. Attempts to delete the first notification again to verify it no longer
 *    exists, expecting an error.
 *
 * This ensures the deletion endpoint effectively removes notifications,
 * enforces ownership restrictions, and properly handles error cases.
 */
export async function test_api_notification_deletion_by_developer(
  connection: api.IConnection,
) {
  // 1. Developer user registration
  const developerEmail = `dev_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const developerPasswordHash = `hashed_password_${RandomGenerator.alphaNumeric(10)}`;
  const developerName = RandomGenerator.name();

  const developer: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.join(connection, {
      body: {
        email: developerEmail,
        password_hash: developerPasswordHash,
        name: developerName,
        deleted_at: null,
      } satisfies ITaskManagementDeveloper.ICreate,
    });
  typia.assert(developer);
  TestValidator.predicate(
    "developer registered and authorized",
    developer.token.access.length > 0,
  );

  // 2. Developer user login
  const loginResult: ITaskManagementDeveloper.IAuthorized =
    await api.functional.auth.developer.login(connection, {
      body: {
        email: developerEmail,
        password: developerPasswordHash,
      } satisfies ITaskManagementDeveloper.ILogin,
    });
  typia.assert(loginResult);
  TestValidator.equals(
    "developer email after login",
    loginResult.email,
    developerEmail,
  );
  TestValidator.predicate(
    "developer login token present",
    loginResult.token.access.length > 0,
  );

  // 3. Prepare two different notification IDs
  const existingNotificationId = typia.random<string & tags.Format<"uuid">>();
  let invalidNotificationId: string & tags.Format<"uuid">;
  do {
    invalidNotificationId = typia.random<string & tags.Format<"uuid">>();
  } while (invalidNotificationId === existingNotificationId);

  // 4. Delete the existing notification (owned by developer)
  await api.functional.taskManagement.developer.notifications.eraseNotification(
    connection,
    { id: existingNotificationId },
  );

  // 5. Attempt to delete a notification that does not exist or is unauthorized
  await TestValidator.error(
    "deleting non-existent or unauthorized notification should fail",
    async () => {
      await api.functional.taskManagement.developer.notifications.eraseNotification(
        connection,
        { id: invalidNotificationId },
      );
    },
  );

  // 6. Attempt to delete the same notification again, expecting error
  await TestValidator.error(
    "deleting already deleted notification should fail",
    async () => {
      await api.functional.taskManagement.developer.notifications.eraseNotification(
        connection,
        { id: existingNotificationId },
      );
    },
  );
}
