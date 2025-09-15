import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * Test the deletion of a notification by a regular user.
 *
 * This test verifies the full flow from user and admin creation,
 * notification creation by admin, and deletion by the regular user. It also
 * tests unauthorized deletion rejection.
 *
 * Steps:
 *
 * 1. Create regular user (email_verified false).
 * 2. Create admin user.
 * 3. Create notification for regular user by admin.
 * 4. Delete notification by regular user.
 * 5. Verify notification deleted - further deletion should fail.
 * 6. Attempt deletion by unauthenticated user, expect error.
 */
export async function test_api_notification_delete_by_regular_user(
  connection: api.IConnection,
) {
  // 1. Create a regular user with email_verified false
  const regularUserCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
    full_name: RandomGenerator.name(),
    email_verified: false,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const regularUser =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: regularUserCreate,
    });
  typia.assert(regularUser);

  // 2. Create an admin user
  const adminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
    full_name: RandomGenerator.name(),
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const adminUser = await api.functional.auth.admin.join.createAdminUser(
    connection,
    {
      body: adminCreate,
    },
  );
  typia.assert(adminUser);

  // 3. Admin user login
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminCreate.email,
      password_hash: adminCreate.password_hash,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 4. Create notification for regular user by admin
  const notificationCreate = {
    type: "registration confirmation",
    content: `Welcome ${regularUserCreate.full_name}, your registration is pending verification.`,
    read: false,
    user_id: regularUser.id,
  } satisfies IEventRegistrationNotification.ICreate;

  const notification =
    await api.functional.eventRegistration.admin.regularUsers.notifications.create(
      connection,
      {
        regularUserId: regularUser.id,
        body: notificationCreate,
      },
    );
  typia.assert(notification);

  // 5. Login regular user (role switch)
  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: {
      email: regularUserCreate.email,
      password_hash: regularUserCreate.password_hash,
    } satisfies IEventRegistrationRegularUser.ILogin,
  });

  // 6. Delete the notification by regular user
  await api.functional.eventRegistration.regularUser.notifications.erase(
    connection,
    {
      notificationId: notification.id,
    },
  );

  // 7. Attempt to delete the same notification again (should fail)
  await TestValidator.error(
    "deleting already deleted notification should fail",
    async () => {
      await api.functional.eventRegistration.regularUser.notifications.erase(
        connection,
        {
          notificationId: notification.id,
        },
      );
    },
  );

  // 8. Attempt deletion without authentication (unauthenticated scenario)
  const unauthenticatedConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated user should not delete notification",
    async () => {
      await api.functional.eventRegistration.regularUser.notifications.erase(
        unauthenticatedConnection,
        {
          notificationId: notification.id,
        },
      );
    },
  );
}
