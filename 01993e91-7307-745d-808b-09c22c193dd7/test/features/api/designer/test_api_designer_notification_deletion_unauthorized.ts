import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";

/**
 * This test validates that deletion of notifications belonging to a
 * Designer user is strictly protected against unauthorized access.
 *
 * The test starts by registering and authenticating a Designer user. It
 * then simulates a notification ID belonging to this user. Finally, it
 * attempts to delete this notification with an unauthorized connection and
 * asserts that the operation is denied, confirming authorization
 * enforcement on notification deletion.
 */
export async function test_api_designer_notification_deletion_unauthorized(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new Designer user
  const designer: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(32),
        name: RandomGenerator.name(),
      } satisfies ITaskManagementDesigner.ICreate,
    });
  typia.assert(designer);

  // Step 2: Generate a UUID representing a notification owned by the Designer
  const notificationId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create a new connection without authorization headers
  const unauthorizedConn: api.IConnection = { ...connection, headers: {} };

  // Step 4: Attempt to delete the notification with the unauthorized connection
  await TestValidator.error(
    "unauthorized user cannot delete designer notification",
    async () => {
      await api.functional.taskManagement.designer.notifications.eraseNotification(
        unauthorizedConn,
        { id: notificationId },
      );
    },
  );
}
