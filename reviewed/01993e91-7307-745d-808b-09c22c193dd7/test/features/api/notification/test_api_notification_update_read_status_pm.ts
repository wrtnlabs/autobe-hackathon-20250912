import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";

/**
 * End-to-End test for updating a notification's read status by a PM user.
 *
 * Workflow:
 *
 * 1. Register a new PM user.
 * 2. Authenticate the PM user and set authorization token.
 * 3. Simulate the presence of a notification associated with the PM user.
 * 4. Update the notification's read status to true.
 * 5. Validate the response fields to verify the read status update.
 *
 * Note: Since there is no API provided to create notifications, this test
 * assumes the notification with generated UUID exists or is accepted for
 * update.
 */
export async function test_api_notification_update_read_status_pm(
  connection: api.IConnection,
) {
  // 1. Register PM user
  const pmCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Pass1234!",
    name: RandomGenerator.name(),
  } satisfies ITaskManagementPm.ICreate;

  const pmUser = await api.functional.auth.pm.join(connection, {
    body: pmCreateBody,
  });
  typia.assert(pmUser);

  // 2. Authenticate PM user
  const pmLoginBody = {
    email: pmCreateBody.email,
    password: pmCreateBody.password,
  } satisfies ITaskManagementPm.ILogin;

  const pmAuthorized = await api.functional.auth.pm.login(connection, {
    body: pmLoginBody,
  });
  typia.assert(pmAuthorized);

  // 3. Simulate notification creation
  const notificationId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date().toISOString();
  const notificationReadAt: string & tags.Format<"date-time"> = now;

  // Original notification data before update
  const originalNotification: ITaskManagementNotification = {
    id: notificationId,
    user_id: pmAuthorized.id,
    task_id: typia.random<string & tags.Format<"uuid">>(),
    notification_type: "assignment",
    is_read: false,
    read_at: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  // 4. Update notification read status
  const updateBody = {
    is_read: true,
    read_at: notificationReadAt,
  } satisfies ITaskManagementNotification.IUpdate;

  const updatedNotification =
    await api.functional.taskManagement.pm.notifications.update(connection, {
      id: notificationId,
      body: updateBody,
    });
  typia.assert(updatedNotification);

  // 5. Validate fields
  TestValidator.equals(
    "notification id should match",
    updatedNotification.id,
    originalNotification.id,
  );
  TestValidator.equals(
    "notification user_id should match",
    updatedNotification.user_id,
    originalNotification.user_id,
  );
  TestValidator.equals(
    "notification task_id should match",
    updatedNotification.task_id,
    originalNotification.task_id,
  );
  TestValidator.equals(
    "notification type should remain unchanged",
    updatedNotification.notification_type,
    originalNotification.notification_type,
  );

  TestValidator.equals(
    "notification is_read should be true",
    updatedNotification.is_read,
    true,
  );

  TestValidator.predicate(
    "notification read_at should be set",
    updatedNotification.read_at !== null &&
      updatedNotification.read_at !== undefined,
  );

  TestValidator.equals(
    "notification deleted_at should remain null",
    updatedNotification.deleted_at,
    null,
  );

  // updated_at must be at or after read_at
  const updatedAt = new Date(updatedNotification.updated_at);
  const readAt = new Date(updatedNotification.read_at!);
  TestValidator.predicate(
    "notification updated_at should be on or after read_at",
    updatedAt >= readAt,
  );
}
