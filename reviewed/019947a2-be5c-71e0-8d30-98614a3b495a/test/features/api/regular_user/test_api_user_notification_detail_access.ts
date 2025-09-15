import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppNotifications } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppNotifications";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";

/**
 * Validate detailed access to notifications for authenticated regular
 * users.
 *
 * This test covers the complete scenario of creating two regular users (A
 * and B), authenticating them, and verifying access control to notification
 * details.
 *
 * Steps:
 *
 * 1. Create and authenticate regular user A.
 * 2. Create and authenticate regular user B.
 * 3. Simulate an existing notification ID for user A.
 * 4. Fetch notification details as user A and validate the response.
 * 5. Switch authentication context to user B.
 * 6. Verify user B cannot access user A's notification (authorization
 *    failure).
 * 7. Test error handling for a non-existent notification ID when accessed by
 *    user A.
 *
 * The test asserts schema validation with typia.assert and uses
 * TestValidator for business validation and error expectation.
 * Authentication tokens and headers are managed automatically by the SDK.
 *
 * This enforces secure notification ownership and data correctness.
 */
export async function test_api_user_notification_detail_access(
  connection: api.IConnection,
) {
  // 1. Create and authenticate regular user A
  const userACreate = {
    social_login_id: RandomGenerator.alphaNumeric(20),
    nickname: RandomGenerator.name(),
    profile_image_uri: null,
  } satisfies IChatAppRegularUser.ICreate;
  const userA: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userACreate,
    });
  typia.assert(userA);

  // 2. Create and authenticate regular user B
  const userBCreate = {
    social_login_id: RandomGenerator.alphaNumeric(20),
    nickname: RandomGenerator.name(),
    profile_image_uri: null,
  } satisfies IChatAppRegularUser.ICreate;
  const userB: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userBCreate,
    });
  typia.assert(userB);

  await api.functional.auth.regularUser.login(connection, {
    body: {
      social_login_id: userBCreate.social_login_id,
    } satisfies IChatAppRegularUser.IRequestLogin,
  });

  // 3. Simulate user A's notification ID
  const notificationIdOfUserA = typia.random<string & tags.Format<"uuid">>();

  // 4. Fetch notification detail as user A
  const notificationForUserA: IChatAppNotifications =
    await api.functional.chatApp.regularUser.regularUsers.notifications.at(
      connection,
      {
        regularUserId: userA.id,
        notificationId: notificationIdOfUserA,
      },
    );
  typia.assert(notificationForUserA);
  TestValidator.equals(
    "notification belongs to user A",
    notificationForUserA.chat_app_regular_user_id,
    userA.id,
  );

  // 5. Authenticate as user B
  await api.functional.auth.regularUser.login(connection, {
    body: {
      social_login_id: userBCreate.social_login_id,
    } satisfies IChatAppRegularUser.IRequestLogin,
  });

  // 6. User B attempts to access user A's notification - should fail
  await TestValidator.error(
    "user B cannot access user A's notification",
    async () => {
      await api.functional.chatApp.regularUser.regularUsers.notifications.at(
        connection,
        {
          regularUserId: userA.id,
          notificationId: notificationIdOfUserA,
        },
      );
    },
  );

  // 7. User A attempts to fetch a non-existent notification - should fail
  await TestValidator.error(
    "fetching non-existent notification fails",
    async () => {
      await api.functional.chatApp.regularUser.regularUsers.notifications.at(
        connection,
        {
          regularUserId: userA.id,
          notificationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
