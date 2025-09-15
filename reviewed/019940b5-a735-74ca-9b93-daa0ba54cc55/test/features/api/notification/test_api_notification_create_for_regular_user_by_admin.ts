import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * Test creation of a notification for a regular user by an admin, including all
 * prerequisite authentications and account creations.
 *
 * The test flow includes:
 *
 * 1. Create an admin user account and assert authorized response.
 * 2. Create a regular user account and assert authorized response.
 * 3. Authenticate as admin user to establish the admin auth context.
 * 4. Create a notification targeting the regular user using admin privileges.
 * 5. Assert properties of the created notification to verify correctness and
 *    business logic.
 *
 * All required properties are provided with schema-compliant and
 * business-realistic values. Token management is automatically handled by the
 * SDK.
 */
export async function test_api_notification_create_for_regular_user_by_admin(
  connection: api.IConnection,
) {
  // 1. Create admin user
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
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

  // 2. Create regular user
  const regularUserCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: false,
  } satisfies IEventRegistrationRegularUser.ICreate;
  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: regularUserCreateBody,
    });
  typia.assert(regularUser);

  // 3. Admin login to establish auth context
  const adminLoginBody = {
    email: adminCreateBody.email,
    password_hash: adminCreateBody.password_hash,
  } satisfies IEventRegistrationAdmin.ILogin;
  const adminLogin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 4. Create notification for regular user
  const notificationCreateBody = {
    user_id: regularUser.id,
    type: "registration confirmation",
    content: `Welcome, ${regularUser.full_name}! Your registration is complete.`,
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

  // 5. Assertions on the notification
  TestValidator.predicate(
    "notification id is a UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      notification.id,
    ),
  );
  TestValidator.equals(
    "notification user_id matches regular user",
    notification.user_id ?? null,
    regularUser.id,
  );
  TestValidator.equals(
    "notification type is correct",
    notification.type,
    notificationCreateBody.type,
  );
  TestValidator.equals(
    "notification content is correct",
    notification.content,
    notificationCreateBody.content,
  );
  TestValidator.equals(
    "notification read flag is false",
    notification.read,
    false,
  );
  // Check created_at and updated_at are in correct ISO 8601 format
  TestValidator.predicate(
    "notification created_at is ISO 8601",
    !isNaN(Date.parse(notification.created_at)),
  );
  TestValidator.predicate(
    "notification updated_at is ISO 8601",
    !isNaN(Date.parse(notification.updated_at)),
  );
  // Check deleted_at is null or undefined
  TestValidator.predicate(
    "notification deleted_at is null or undefined",
    notification.deleted_at === null || notification.deleted_at === undefined,
  );
}
