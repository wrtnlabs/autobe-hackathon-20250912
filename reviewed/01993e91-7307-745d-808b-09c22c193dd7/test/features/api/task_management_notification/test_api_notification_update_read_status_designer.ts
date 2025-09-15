import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import type { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";

export async function test_api_notification_update_read_status_designer(
  connection: api.IConnection,
) {
  // 1. Register a new Designer user
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password = "validHashedPassword123"; // used as password hash directly for test
  const name = RandomGenerator.name();

  const designer: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: {
        email,
        password_hash: password,
        name,
      } satisfies ITaskManagementDesigner.ICreate,
    });
  typia.assert(designer);

  // 2. Login the same Designer user
  const loggedInDesigner: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.login(connection, {
      body: {
        email,
        password, // plaintext expected in login
      } satisfies ITaskManagementDesigner.ILogin,
    });
  typia.assert(loggedInDesigner);

  // 3. Prepare a notification for this Designer user
  // Since no API provided to create notification, simulate notification data for update test
  const notificationId = typia.random<string & tags.Format<"uuid">>();
  const initialReadAt = null;

  // 4. Update notification read status using PUT /taskManagement/designer/notifications/{id}
  const nowIso = new Date().toISOString();
  const updateBody = {
    is_read: true,
    read_at: nowIso,
  } satisfies ITaskManagementNotification.IUpdate;

  const updatedNotification: ITaskManagementNotification =
    await api.functional.taskManagement.designer.notifications.update(
      connection,
      {
        id: notificationId,
        body: updateBody,
      },
    );
  typia.assert(updatedNotification);

  TestValidator.equals(
    "Notification ID remains unchanged",
    updatedNotification.id,
    notificationId,
  );
  TestValidator.equals(
    "Notification user ID matches designer ID",
    updatedNotification.user_id,
    designer.id,
  );
  TestValidator.equals(
    "Notification is_read is true",
    updatedNotification.is_read,
    true,
  );
  TestValidator.equals(
    "Notification read_at is updated",
    updatedNotification.read_at,
    nowIso,
  );

  // 5. Test error for non-existent notification ID
  const invalidNotificationId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Updating non-existent notification should throw 404",
    async () => {
      await api.functional.taskManagement.designer.notifications.update(
        connection,
        {
          id: invalidNotificationId,
          body: { is_read: true } satisfies ITaskManagementNotification.IUpdate,
        },
      );
    },
  );

  // 6. Test unauthorized update
  // Register and login a second Designer user
  const anotherEmail = typia.random<string & tags.Format<"email">>();
  const anotherDesigner: ITaskManagementDesigner.IAuthorized =
    await api.functional.auth.designer.join(connection, {
      body: {
        email: anotherEmail,
        password_hash: password,
        name: RandomGenerator.name(),
      } satisfies ITaskManagementDesigner.ICreate,
    });
  typia.assert(anotherDesigner);

  await api.functional.auth.designer.login(connection, {
    body: {
      email: anotherEmail,
      password,
    } satisfies ITaskManagementDesigner.ILogin,
  });

  await TestValidator.error(
    "Unauthorized user cannot update notification (should throw 403)",
    async () => {
      await api.functional.taskManagement.designer.notifications.update(
        connection,
        {
          id: notificationId,
          body: {
            is_read: false,
          } satisfies ITaskManagementNotification.IUpdate,
        },
      );
    },
  );
}
