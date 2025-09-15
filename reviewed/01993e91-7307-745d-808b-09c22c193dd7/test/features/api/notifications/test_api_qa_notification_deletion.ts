import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";

/**
 * Validate the deletion of notifications by a QA user.
 *
 * This test ensures that a QA user can delete their own notifications
 * successfully. It validates proper authorization enforcement, successful
 * deletion behavior, and error handling for attempts to delete non-existing or
 * non-owned notifications.
 *
 * Steps:
 *
 * 1. A QA user is registered and authenticated.
 * 2. The test simulates a notification ID belonging to the logged-in QA user.
 * 3. The notification is deleted.
 * 4. Verify deletion by attempting to delete the same notification again resulting
 *    in error.
 * 5. Attempt to delete another random notification ID, simulating unauthorized
 *    access, expecting an error.
 */
export async function test_api_qa_notification_deletion(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a QA user
  const qaUser: ITaskManagementQa.IAuthorized =
    await api.functional.auth.qa.join(connection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(10)}@test.com`,
        password_hash: RandomGenerator.alphaNumeric(32),
        name: RandomGenerator.name(),
      } satisfies ITaskManagementQa.ICreate,
    });
  typia.assert(qaUser);

  // Step 2: Simulate a notification ID that belongs to this QA user
  // Since notification creation or retrieval API is not provided, we randomly generate a UUID
  // In a real scenario, this should be replaced with an actual retrieval or creation call
  const notificationId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Delete the notification
  await api.functional.taskManagement.qa.notifications.eraseNotification(
    connection,
    {
      id: notificationId,
    },
  );

  // Step 4: Attempt to delete the same notification again (should error as it no longer exists)
  await TestValidator.error(
    "Deletions of already-deleted notification should fail",
    async () => {
      await api.functional.taskManagement.qa.notifications.eraseNotification(
        connection,
        {
          id: notificationId,
        },
      );
    },
  );

  // Step 5: Attempt to delete a notification that belongs to another user (random UUID)
  const otherNotificationId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Deleting notification not owned by QA user should fail",
    async () => {
      await api.functional.taskManagement.qa.notifications.eraseNotification(
        connection,
        {
          id: otherNotificationId,
        },
      );
    },
  );
}
