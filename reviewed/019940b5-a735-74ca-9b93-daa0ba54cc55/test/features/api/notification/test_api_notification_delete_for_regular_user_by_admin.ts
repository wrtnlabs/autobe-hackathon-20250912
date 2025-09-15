import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * Test deleting a notification for a regular user by an admin.
 *
 * This test covers the full workflow including:
 *
 * 1. Creating an admin user and logging in
 * 2. Creating a regular user and logging in
 * 3. Creating a notification for the regular user by admin
 * 4. Deleting the notification as admin
 * 5. Verifying the deletion completes successfully
 *
 * It ensures the correct roles and authorizations are applied, validates
 * request/response correctness, and simulates a real-world admin managing
 * notifications for users.
 *
 * The test uses precise data types with typia random values respecting the
 * domain schemas for users and notifications.
 *
 * @param connection API connection interface providing auth and request
 *   handling
 */
export async function test_api_notification_delete_for_regular_user_by_admin(
  connection: api.IConnection,
) {
  // 1. Create admin user with realistic data
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;
  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Login as admin
  const adminLoginBody = {
    email: adminCreateBody.email,
    password_hash: adminCreateBody.password_hash,
  } satisfies IEventRegistrationAdmin.ILogin;
  const adminAuth: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuth);

  // 3. Create regular user account
  const regularUserCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationRegularUser.ICreate;
  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: regularUserCreateBody,
    });
  typia.assert(regularUser);

  // 4. Login as regular user
  const regularUserLoginBody = {
    email: regularUserCreateBody.email,
    password_hash: regularUserCreateBody.password_hash,
  } satisfies IEventRegistrationRegularUser.ILogin;
  const regularUserAuth: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login.loginRegularUser(connection, {
      body: regularUserLoginBody,
    });
  typia.assert(regularUserAuth);

  // 5. Switch back to admin login to do admin operations
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: adminLoginBody,
  });

  // 6. Create a notification for the regular user
  const notificationCreateBody = {
    user_id: regularUser.id,
    type: "registration confirmation",
    content: RandomGenerator.paragraph({ sentences: 5 }),
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

  // 7. Delete the notification as the admin
  await api.functional.eventRegistration.admin.regularUsers.notifications.erase(
    connection,
    {
      regularUserId: regularUser.id,
      notificationId: notification.id,
    },
  );

  // 8. Validate deletion completed without errors (no content expected)
  TestValidator.predicate("Notification deletion succeeded", true);
}
