import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";

/**
 * Test updating an existing notification's read status and content by its
 * unique ID using admin authentication.
 *
 * This test creates an admin user account, creates a notification record,
 * then updates the notification's read flag and content. It validates that
 * the update has persisted correctly.
 *
 * Steps:
 *
 * 1. Create admin user with required details.
 * 2. Create a notification record with specified type, content, and unread
 *    state.
 * 3. Update the notification with read flag set to true and new content.
 * 4. Validate that the updated notification's fields are correctly changed.
 */
export async function test_api_admin_notification_update_success(
  connection: api.IConnection,
) {
  // 1. Create admin user
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: RandomGenerator.alphaNumeric(16),
        full_name: RandomGenerator.name(),
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(adminUser);

  // 2. Create notification record
  const notificationType = "registration confirmation";
  const notificationContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const createBody = {
    user_id: null,
    type: notificationType,
    content: notificationContent,
    read: false,
  } satisfies IEventRegistrationNotification.ICreate;
  const notification: IEventRegistrationNotification =
    await api.functional.eventRegistration.admin.notifications.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(notification);

  // 3. Update notification record with changed read status and updated content
  const updatedContent = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const updateBody = {
    read: true,
    content: updatedContent,
  } satisfies IEventRegistrationNotification.IUpdate;
  const updatedNotification: IEventRegistrationNotification =
    await api.functional.eventRegistration.admin.notifications.update(
      connection,
      {
        notificationId: notification.id,
        body: updateBody,
      },
    );
  typia.assert(updatedNotification);

  // 4. Validate that updated fields are correctly updated
  TestValidator.equals(
    "notification id unchanged",
    updatedNotification.id,
    notification.id,
  );
  TestValidator.equals(
    "notification read flag updated",
    updatedNotification.read,
    true,
  );
  TestValidator.equals(
    "notification content updated",
    updatedNotification.content,
    updatedContent,
  );
}
