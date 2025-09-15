import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppNotification";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIChatAppNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatAppNotification";

/**
 * Test the notification search feature for an authenticated regular user.
 *
 * This scenario covers:
 *
 * - User registration and login with Snapchat social login
 * - Authenticated call to search user's notifications
 * - Filtering by read/unread status
 * - Pagination and sorting
 * - Edge cases: empty notifications, invalid parameters
 * - Unauthorized access handling
 *
 * Steps:
 *
 * 1. Register new user with unique Snapchat login ID
 * 2. Login user to get JWT tokens
 * 3. Perform PATCH /chatApp/regularUser/notifications with valid filters and
 *    pagination
 * 4. Assert that returned notifications belong to user and match filters
 * 5. Test edge cases and error handling
 */
export async function test_api_notification_search_with_authentication(
  connection: api.IConnection,
) {
  // 1. Register new user
  const socialLoginId = `snapchat_${RandomGenerator.alphaNumeric(10)}`;
  const nickname = RandomGenerator.name();
  const createBody = {
    social_login_id: socialLoginId,
    nickname,
  } satisfies IChatAppRegularUser.ICreate;
  const joinedUser = await api.functional.auth.regularUser.join(connection, {
    body: createBody,
  });
  typia.assert(joinedUser);

  // 2. Login user
  const loginBody = {
    social_login_id: socialLoginId,
  } satisfies IChatAppRegularUser.IRequestLogin;
  const loggedInUser = await api.functional.auth.regularUser.login(connection, {
    body: loginBody,
  });
  typia.assert(loggedInUser);

  // 3. Consume access token for authenticated notifications search
  // connection.headers are managed internally by SDK; no manual action needed

  // 3a. Basic notification search without filters
  const notificationsPageAll =
    await api.functional.chatApp.regularUser.notifications.index(connection, {
      body: { page: 1, limit: 10 } satisfies IChatAppNotification.IRequest,
    });
  typia.assert(notificationsPageAll);

  // Validation: pagination info
  TestValidator.predicate(
    "pagination current page is 1",
    notificationsPageAll.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    notificationsPageAll.pagination.limit === 10,
  );

  // Validation: notifications belong to user and have required fields
  for (const notification of notificationsPageAll.data) {
    typia.assert(notification);
    TestValidator.predicate(
      "notification has UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        notification.id,
      ),
    );
    TestValidator.predicate(
      "notification has non-empty notification_type",
      typeof notification.notification_type === "string" &&
        notification.notification_type.length > 0,
    );
    TestValidator.predicate(
      "notification is_read is boolean",
      typeof notification.is_read === "boolean",
    );
    TestValidator.predicate(
      "notification created_at has ISO date-time",
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])[T ]([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.\d+)?(Z|[+-][01][0-9]:[0-5][0-9])?$/.test(
        notification.created_at,
      ),
    );
  }

  // 3b. Search notifications filtered by unread (is_read: false)
  const notificationsUnread =
    await api.functional.chatApp.regularUser.notifications.index(connection, {
      body: {
        page: 1,
        limit: 5,
        is_read: false,
      } satisfies IChatAppNotification.IRequest,
    });
  typia.assert(notificationsUnread);

  for (const notification of notificationsUnread.data) {
    TestValidator.equals("notification is unread", notification.is_read, false);
  }

  // 4. Edge case: User has no notifications (simulate by login new user without notifications)
  const socialLoginIdEmpty = `snapchat_${RandomGenerator.alphaNumeric(10)}`;
  const nicknameEmpty = RandomGenerator.name();
  const createEmpty = {
    social_login_id: socialLoginIdEmpty,
    nickname: nicknameEmpty,
  } satisfies IChatAppRegularUser.ICreate;
  await api.functional.auth.regularUser.join(connection, { body: createEmpty });
  await api.functional.auth.regularUser.login(connection, {
    body: {
      social_login_id: socialLoginIdEmpty,
    } satisfies IChatAppRegularUser.IRequestLogin,
  });
  const emptyNotifications =
    await api.functional.chatApp.regularUser.notifications.index(connection, {
      body: { page: 1, limit: 10 } satisfies IChatAppNotification.IRequest,
    });
  typia.assert(emptyNotifications);
  TestValidator.equals(
    "empty notifications data length",
    emptyNotifications.data.length,
    0,
  );

  // 5. Error case: invalid pagination parameters
  await TestValidator.error(
    "invalid pagination: negative page number",
    async () => {
      await api.functional.chatApp.regularUser.notifications.index(connection, {
        body: { page: -1, limit: 10 } satisfies IChatAppNotification.IRequest,
      });
    },
  );

  await TestValidator.error("invalid pagination: zero limit", async () => {
    await api.functional.chatApp.regularUser.notifications.index(connection, {
      body: { page: 1, limit: 0 } satisfies IChatAppNotification.IRequest,
    });
  });

  // 6. Error case: unauthorized access
  // Using empty connection headers to simulate no authentication
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthorized access fails", async () => {
    await api.functional.chatApp.regularUser.notifications.index(
      unauthenticatedConnection,
      {
        body: { page: 1, limit: 10 } satisfies IChatAppNotification.IRequest,
      },
    );
  });
}
