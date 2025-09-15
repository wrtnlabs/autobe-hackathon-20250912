import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";

/**
 * This test function verifies the correctness and security of the Designer
 * notification deletion API.
 *
 * It performs a full cycle of registering a new Designer user,
 * authenticating, and attempting to delete notifications. The test
 * validates both success and failure scenarios including unauthorized
 * access and deletion of non-existent notifications.
 *
 * Steps:
 *
 * 1. Register a new Designer user to obtain authentication tokens.
 * 2. Simulate deletion of a notification using a valid UUID as notification
 *    ID.
 * 3. Confirm deletion succeeds without error.
 * 4. Attempt deletion of a non-existent notification and expect an error.
 * 5. Attempt deletion without authentication and expect an unauthorized error.
 *
 * This ensures the DELETE /taskManagement/designer/notifications/{id}
 * endpoint enforces authorization and handles missing resources
 * appropriately.
 */
export async function test_api_designer_notification_deletion(
  connection: api.IConnection,
) {
  // 1. Register a new Designer user with valid data
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = RandomGenerator.alphaNumeric(12);
  const userName: string = RandomGenerator.name();

  const authorizedDesigner: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: {
        email: userEmail,
        password_hash: userPassword,
        name: userName,
      } satisfies ITaskManagementDesigner.ICreate,
    });

  typia.assert(authorizedDesigner);

  // 2. Generate a random UUID to simulate an existing notification ID
  const notificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Delete the notification with the fake ID, expecting success (no error)
  await api.functional.taskManagement.designer.notifications.eraseNotification(
    connection,
    { id: notificationId },
  );

  // 4. Attempt to delete a non-existent notification and expect an error
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "deleting non-existent notification should throw error",
    async () => {
      await api.functional.taskManagement.designer.notifications.eraseNotification(
        connection,
        { id: nonExistentId },
      );
    },
  );

  // 5. Attempt deletion without authorization
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized deletion should throw error",
    async () => {
      await api.functional.taskManagement.designer.notifications.eraseNotification(
        unauthenticatedConnection,
        { id: notificationId },
      );
    },
  );
}
