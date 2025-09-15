import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppNotification";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";

/**
 * E2E test for notification details access control.
 *
 * This test performs the following sequence:
 *
 * 1. Creates and authenticates a regular user.
 * 2. Uses the user's token to fetch a notification detail.
 * 3. Ensures that unauthorized requests fail.
 * 4. Ensures access is forbidden for notifications not owned by the user.
 *
 * The test validates full DTO compliance for notification details and correct
 * enforcement of access control.
 */
export async function test_api_notification_detail_access_control(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user account
  const userCreateBody = {
    social_login_id: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    profile_image_uri: null,
  } satisfies IChatAppRegularUser.ICreate;
  const createdUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(createdUser);

  // Step 2: Authenticate the user to obtain tokens
  const userLoginBody = {
    social_login_id: userCreateBody.social_login_id,
  } satisfies IChatAppRegularUser.IRequestLogin;
  const loggedInUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: userLoginBody,
    });
  typia.assert(loggedInUser);

  // Confirm that token access updated
  TestValidator.equals("user IDs match", createdUser.id, loggedInUser.id);

  // Step 3: Retrieve an existing notification for the user by fetching user notifications list with simulation if possible
  // Since there is no API to list notifications or create, attempt with sim mode to get random notification or adapt the test to use an existing notification id.
  // Here, call .at with a randomly generated notification ID, then expect error or success based on simulate mode

  // We'll try to fetch a notification that exists or simulate data
  // So first, fetch using simulate to obtain a notification
  const simulatedNotification: IChatAppNotification =
    await api.functional.chatApp.regularUser.notifications.at(connection, {
      notificationId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(simulatedNotification);

  // Step 4: Fetch notification detail with proper authentication (should succeed)
  const fetchedNotification: IChatAppNotification =
    await api.functional.chatApp.regularUser.notifications.at(connection, {
      notificationId: simulatedNotification.id,
    });
  typia.assert(fetchedNotification);

  TestValidator.equals(
    "notification belongs to user",
    fetchedNotification.chat_app_regular_user_id,
    createdUser.id,
  );

  // Step 5: Test unauthorized access (no auth token)
  const noAuthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access without token should fail",
    async () => {
      await api.functional.chatApp.regularUser.notifications.at(noAuthConn, {
        notificationId: fetchedNotification.id,
      });
    },
  );

  // Step 6: Fetch non-existent notification ID
  await TestValidator.error(
    "accessing non-existent notification should fail",
    async () => {
      await api.functional.chatApp.regularUser.notifications.at(connection, {
        notificationId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // Step 7: Create another user
  const otherUserBody = {
    social_login_id: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    profile_image_uri: null,
  } satisfies IChatAppRegularUser.ICreate;
  const otherUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: otherUserBody,
    });
  typia.assert(otherUser);

  // Login as other user
  const otherUserLoginBody = {
    social_login_id: otherUserBody.social_login_id,
  } satisfies IChatAppRegularUser.IRequestLogin;
  const otherLoggedInUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: otherUserLoginBody,
    });
  typia.assert(otherLoggedInUser);

  // Step 8: other user tries to access first user's notification, expecting error
  await TestValidator.error(
    "user cannot access another user's notification",
    async () => {
      await api.functional.chatApp.regularUser.notifications.at(connection, {
        notificationId: fetchedNotification.id,
      });
    },
  );
}
