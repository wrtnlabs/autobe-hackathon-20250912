import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * Test updating a notification record as a regular user by marking it read or
 * modifying content.
 *
 * This test simulates the full life cycle of notification management:
 *
 * 1. Create a regular user account with realistic valid data.
 * 2. Create an admin user account and authenticate.
 * 3. Admin creates a notification for the regular user.
 * 4. Switch authentication context back to the regular user by logging in.
 * 5. Regular user updates the notification (e.g. marks as read).
 * 6. Validate that the update was applied correctly.
 *
 * This covers multi-role authentication, permission validations, and data
 * integrity.
 */
export async function test_api_notification_update_by_id_regular_user_success(
  connection: api.IConnection,
) {
  // 1. Regular user joins the system
  const regularUserJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: regularUserJoinBody,
    });
  typia.assert(regularUser);

  // 2. Admin user joins the system
  const adminUserJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@admin.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminUserJoinBody,
    });
  typia.assert(adminUser);

  // 3. Admin logs in to get token
  const adminLoginBody = {
    email: adminUser.email,
    password_hash: adminUserJoinBody.password_hash,
  } satisfies IEventRegistrationAdmin.ILogin;

  const adminLogin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 4. Use admin token by re-authenticating using the login token (handled by SDK)
  // No manual header operations allowed

  // 5. Admin creates notification for regular user
  const notificationCreateBody = {
    user_id: regularUser.id,
    type: "registration confirmation",
    content: "Welcome to our event registration system.",
    read: false,
  } satisfies IEventRegistrationNotification.ICreate;

  const notification: IEventRegistrationNotification =
    await api.functional.eventRegistration.admin.regularUsers.notifications.create(
      connection,
      {
        regularUserId: regularUser.id,
        body: notificationCreateBody,
      },
    );
  typia.assert(notification);

  // 6. Switch to regular user by logging in again
  const regularUserLoginBody = {
    email: regularUser.email,
    password_hash: regularUserJoinBody.password_hash,
  } satisfies IEventRegistrationRegularUser.ILogin;

  const regularUserLogin: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login.loginRegularUser(connection, {
      body: regularUserLoginBody,
    });
  typia.assert(regularUserLogin);

  // 7. Regular user updates notification (e.g. mark as read)
  const notificationUpdateBody = {
    read: true,
  } satisfies IEventRegistrationNotification.IUpdate;

  const updatedNotification: IEventRegistrationNotification =
    await api.functional.eventRegistration.regularUser.notifications.update(
      connection,
      {
        notificationId: notification.id,
        body: notificationUpdateBody,
      },
    );
  typia.assert(updatedNotification);

  // 8. Validate that update has taken effect
  TestValidator.equals(
    "Notification read flag is updated",
    updatedNotification.read,
    true,
  );
  TestValidator.equals(
    "Notification ID remains unchanged",
    updatedNotification.id,
    notification.id,
  );
  TestValidator.equals(
    "Notification user ID remains unchanged",
    updatedNotification.user_id,
    regularUser.id,
  );
  TestValidator.equals(
    "Notification type remains unchanged",
    updatedNotification.type,
    notification.type,
  );
  TestValidator.equals(
    "Notification content remains unchanged",
    updatedNotification.content,
    notification.content,
  );
}
