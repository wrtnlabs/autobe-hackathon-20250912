import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

export async function test_api_notification_update_for_regular_user_by_admin(
  connection: api.IConnection,
) {
  // 1. Create admin user and authenticate
  const adminCreateBody = {
    email: `admin${RandomGenerator.alphaNumeric(5)}@admin.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;
  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Login as admin to ensure active authentication context
  const adminLoginBody = {
    email: adminCreateBody.email,
    password_hash: adminCreateBody.password_hash,
  } satisfies IEventRegistrationAdmin.ILogin;
  const adminLogin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 3. Create regular user to be the notification target
  const regularUserCreateBody = {
    email: `user${RandomGenerator.alphaNumeric(5)}@user.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationRegularUser.ICreate;
  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: regularUserCreateBody,
    });
  typia.assert(regularUser);

  // 4. Admin creates a notification for the regular user
  const initialNotificationBody = {
    user_id: regularUser.id,
    type: "registration confirmation",
    content: `Welcome ${regularUser.full_name}, your registration is successful.`,
    read: false,
  } satisfies IEventRegistrationNotification.ICreate;
  const notification: IEventRegistrationNotification =
    await api.functional.eventRegistration.admin.regularUsers.notifications.create(
      connection,
      {
        regularUserId: regularUser.id,
        body: initialNotificationBody,
      },
    );
  typia.assert(notification);

  // 5. Admin updates the notification to mark as read and changes content
  const updatedNotificationBody = {
    read: true,
    content: `Hello ${regularUser.full_name}, your registration details have been updated.`,
  } satisfies IEventRegistrationNotification.IUpdate;
  const updatedNotification: IEventRegistrationNotification =
    await api.functional.eventRegistration.admin.regularUsers.notifications.update(
      connection,
      {
        regularUserId: regularUser.id,
        notificationId: notification.id,
        body: updatedNotificationBody,
      },
    );
  typia.assert(updatedNotification);

  // 6. Validate that the updated notification has expected properties
  TestValidator.equals(
    "notification id unchanged after update",
    updatedNotification.id,
    notification.id,
  );
  TestValidator.equals(
    "notification user_id matches regularUser id",
    updatedNotification.user_id,
    regularUser.id,
  );
  TestValidator.equals(
    "notification read flag is true after update",
    updatedNotification.read,
    true,
  );
  TestValidator.equals(
    "notification content is updated",
    updatedNotification.content,
    updatedNotificationBody.content,
  );
  TestValidator.predicate(
    "notification updated_at is updated to be after created_at",
    new Date(updatedNotification.updated_at).getTime() >=
      new Date(updatedNotification.created_at).getTime(),
  );
}
