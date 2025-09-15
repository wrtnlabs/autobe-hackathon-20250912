import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppNotifications } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppNotifications";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIChatAppNotifications } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatAppNotifications";

/**
 * This end-to-end test validates the complete workflow for filtered
 * notification retrieval in the chat application. It covers user registration,
 * authentication, filtered notification queries, pagination validation, and
 * authorization enforcement.
 *
 * A realistic new regular user is registered and immediately authenticated. The
 * test then exercises the notification listing endpoint with various filter
 * parameters for is_read status and pagination controls. It asserts that
 * responses conform exactly to the expected schema and that the filtering
 * operates properly on the notification read/unread status.
 *
 * An unauthorized attempt to retrieve notification data is also tested,
 * ensuring access control is correctly enforced.
 *
 * The test leverages typia for perfect runtime type assertions and
 * TestValidator for descriptive business rule validations. It demonstrates a
 * secure, complete user journey with meaningful data validations and error
 * condition checks.
 */
export async function test_api_user_notification_list_with_filters(
  connection: api.IConnection,
) {
  // Step 1: Register a new regular user
  const createBody = {
    social_login_id: `snap_${RandomGenerator.alphaNumeric(8)}`,
    nickname: RandomGenerator.name(),
    profile_image_uri: null,
  } satisfies IChatAppRegularUser.ICreate;
  const authorizedUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: createBody,
    });
  typia.assert(authorizedUser);

  // Step 2: Authenticate the same user to establish session context
  const loginBody = {
    social_login_id: authorizedUser.social_login_id,
  } satisfies IChatAppRegularUser.IRequestLogin;
  const loggedInUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);

  // Step 3: Retrieve initial notifications with no filters (empty body)
  const emptyFilterBody = {} satisfies IChatAppNotifications.IRequest;
  const notificationsAll: IPageIChatAppNotifications.ISummary =
    await api.functional.chatApp.regularUser.regularUsers.notifications.index(
      connection,
      {
        regularUserId: authorizedUser.id,
        body: emptyFilterBody,
      },
    );
  typia.assert(notificationsAll);

  // Step 4: Validate pagination metadata and appearance of notification list
  TestValidator.predicate(
    "pagination is object",
    typeof notificationsAll.pagination === "object",
  );
  TestValidator.predicate(
    "data is array",
    Array.isArray(notificationsAll.data),
  );
  if (notificationsAll.data.length > 0) {
    const sampleNotification = notificationsAll.data[0];
    TestValidator.predicate(
      "notification has id",
      typeof sampleNotification.id === "string" &&
        sampleNotification.id.length > 0,
    );
    TestValidator.predicate(
      "notification has notification_type",
      typeof sampleNotification.notification_type === "string" &&
        sampleNotification.notification_type.length > 0,
    );
    TestValidator.predicate(
      "notification has is_read boolean",
      typeof sampleNotification.is_read === "boolean",
    );
    TestValidator.predicate(
      "notification has created_at",
      typeof sampleNotification.created_at === "string",
    );
    TestValidator.predicate(
      "notification has updated_at",
      typeof sampleNotification.updated_at === "string",
    );
  }

  // Step 5: Retrieve notifications filtered by unread status (is_read: false)
  const unreadFilterBody = {
    is_read: false,
  } satisfies IChatAppNotifications.IRequest;
  const notificationsUnread: IPageIChatAppNotifications.ISummary =
    await api.functional.chatApp.regularUser.regularUsers.notifications.index(
      connection,
      {
        regularUserId: authorizedUser.id,
        body: unreadFilterBody,
      },
    );
  typia.assert(notificationsUnread);
  TestValidator.predicate(
    "all notifications are unread",
    notificationsUnread.data.every((n) => n.is_read === false),
  );

  // Step 6: Retrieve notifications filtered by read status (is_read: true)
  const readFilterBody = {
    is_read: true,
  } satisfies IChatAppNotifications.IRequest;
  const notificationsRead: IPageIChatAppNotifications.ISummary =
    await api.functional.chatApp.regularUser.regularUsers.notifications.index(
      connection,
      {
        regularUserId: authorizedUser.id,
        body: readFilterBody,
      },
    );
  typia.assert(notificationsRead);
  TestValidator.predicate(
    "all notifications are read",
    notificationsRead.data.every((n) => n.is_read === true),
  );

  // Step 7: Retrieve notification list with pagination parameters (page 1, limit 5)
  const paginationBody = {
    page: 1,
    limit: 5,
  } satisfies IChatAppNotifications.IRequest;
  const pagedNotifications: IPageIChatAppNotifications.ISummary =
    await api.functional.chatApp.regularUser.regularUsers.notifications.index(
      connection,
      {
        regularUserId: authorizedUser.id,
        body: paginationBody,
      },
    );
  typia.assert(pagedNotifications);
  TestValidator.equals(
    "pagination limit is 5",
    pagedNotifications.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination current page is 1",
    pagedNotifications.pagination.current,
    1,
  );

  // Step 8: Retrieve notification list with empty filters object again
  const emptyFiltersAgain = {} satisfies IChatAppNotifications.IRequest;
  const emptyFilterResult: IPageIChatAppNotifications.ISummary =
    await api.functional.chatApp.regularUser.regularUsers.notifications.index(
      connection,
      {
        regularUserId: authorizedUser.id,
        body: emptyFiltersAgain,
      },
    );
  typia.assert(emptyFilterResult);

  // Step 9: Attempt unauthorized access
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized access to notifications should fail",
    async () => {
      await api.functional.chatApp.regularUser.regularUsers.notifications.index(
        unauthenticatedConnection,
        {
          regularUserId: authorizedUser.id,
          body: emptyFilterBody,
        },
      );
    },
  );
}
