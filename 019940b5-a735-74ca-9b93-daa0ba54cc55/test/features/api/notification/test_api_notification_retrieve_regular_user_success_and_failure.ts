import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * Test retrieving notifications for a regular user including both
 * successful retrieval of owned notifications and failure scenarios when
 * trying to retrieve non-existent or unauthorized notifications.
 *
 * This test follows the business flow:
 *
 * 1. Register a new regular user using the join API.
 * 2. Login as the created user to obtain authentication token context.
 * 3. Attempt to retrieve a notification belonging to the user.
 * 4. Validate the notification data matches the expected type.
 * 5. Attempt retrieval with invalid or mismatched notification ID to assert
 *    proper error handling.
 *
 * This ensures secure, correct access control for notifications in the
 * event registration domain.
 */
export async function test_api_notification_retrieve_regular_user_success_and_failure(
  connection: api.IConnection,
) {
  // 1. Prepare regular user registration data
  const createUserBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationRegularUser.ICreate;

  // 2. Call join API to create the regular user
  const authorizedUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: createUserBody,
    });
  typia.assert(authorizedUser);

  // 3. Call login API for the created user to set auth context
  const loginBody = {
    email: createUserBody.email,
    password_hash: createUserBody.password_hash,
  } satisfies IEventRegistrationRegularUser.ILogin;

  const loginUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login.loginRegularUser(connection, {
      body: loginBody,
    });
  typia.assert(loginUser);

  // 4. Attempt to retrieve an existing notification for this user
  // Since no notification creation API, simulate using generated UUIDs
  const notificationId = typia.random<string & tags.Format<"uuid">>();
  const regularUserId = authorizedUser.id;

  const notification: IEventRegistrationNotification =
    await api.functional.eventRegistration.regularUser.regularUsers.notifications.at(
      connection,
      {
        regularUserId,
        notificationId,
      },
    );
  typia.assert(notification);

  // 5. Test failure scenario: retrieval of a notification with invalid notificationId
  await TestValidator.error(
    "should fail retrieving notification with invalid notificationId",
    async () => {
      const invalidNotificationId = typia.random<
        string & tags.Format<"uuid">
      >();
      await api.functional.eventRegistration.regularUser.regularUsers.notifications.at(
        connection,
        {
          regularUserId,
          notificationId: invalidNotificationId,
        },
      );
    },
  );

  // 6. Test failure scenario: retrieval with invalid regularUserId (different user)
  await TestValidator.error(
    "should fail retrieving notification with unauthorized regularUserId",
    async () => {
      const invalidRegularUserId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.eventRegistration.regularUser.regularUsers.notifications.at(
        connection,
        {
          regularUserId: invalidRegularUserId,
          notificationId,
        },
      );
    },
  );
}
