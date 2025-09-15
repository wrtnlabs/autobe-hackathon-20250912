import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * Test retrieving a specific notification by ID as a regular user. The
 * scenario includes creating a new regular user authentication context via
 * join, generating a notification for the user via admin API, and then
 * retrieving the notification by its ID using the regular user
 * authentication. This validates successful notification retrieval and
 * authorization enforcement.
 */
export async function test_api_notification_retrieve_by_id_regular_user_success(
  connection: api.IConnection,
) {
  // 1. Regular user joins
  const regularUserJoinBody = {
    email: `user${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: false,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: regularUserJoinBody,
    });
  typia.assert(regularUser);

  // 2. Admin user joins
  const adminJoinBody = {
    email: `admin${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminUser);

  // 3. Admin user login
  const adminLoginBody = {
    email: adminJoinBody.email,
    password_hash: adminJoinBody.password_hash,
  } satisfies IEventRegistrationAdmin.ILogin;

  const adminLogin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 4. Create notification for the regular user
  const notificationCreateBody = {
    user_id: regularUser.id,
    type: "registration confirmation",
    content: `Welcome ${regularUser.full_name} to our event registration platform!`,
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
  TestValidator.equals(
    "notification user_id equals regular user id",
    notification.user_id,
    regularUser.id,
  );

  // 5. Regular user login
  const regularUserLoginBody = {
    email: regularUserJoinBody.email,
    password_hash: regularUserJoinBody.password_hash,
  } satisfies IEventRegistrationRegularUser.ILogin;

  const regularUserLogin: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login.loginRegularUser(connection, {
      body: regularUserLoginBody,
    });
  typia.assert(regularUserLogin);

  // 6. Regular user retrieves notification by id
  const retrievedNotification: IEventRegistrationNotification =
    await api.functional.eventRegistration.regularUser.notifications.at(
      connection,
      {
        notificationId: notification.id,
      },
    );
  typia.assert(retrievedNotification);

  // Validate that the retrieved notification matches the created one
  TestValidator.equals(
    "notification id matches",
    retrievedNotification.id,
    notification.id,
  );
  TestValidator.equals(
    "notification user_id matches regular user",
    retrievedNotification.user_id,
    regularUser.id,
  );
  TestValidator.equals(
    "notification type matches",
    retrievedNotification.type,
    notificationCreateBody.type,
  );
  TestValidator.equals(
    "notification content matches",
    retrievedNotification.content,
    notificationCreateBody.content,
  );
  TestValidator.predicate(
    "notification read flag is false",
    retrievedNotification.read === false,
  );
  TestValidator.predicate(
    "notification has creation timestamp",
    typeof retrievedNotification.created_at === "string" &&
      retrievedNotification.created_at.length > 0,
  );
  TestValidator.predicate(
    "notification has update timestamp",
    typeof retrievedNotification.updated_at === "string" &&
      retrievedNotification.updated_at.length > 0,
  );
}
