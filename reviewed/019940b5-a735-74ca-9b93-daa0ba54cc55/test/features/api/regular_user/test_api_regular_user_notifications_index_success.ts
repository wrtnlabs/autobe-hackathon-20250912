import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationNotifications } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotifications";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationNotifications } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationNotifications";

export async function test_api_regular_user_notifications_index_success(
  connection: api.IConnection,
) {
  // 1. Create a new regular user account by calling the join API with valid data
  const email = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const password_hash = RandomGenerator.alphaNumeric(32);
  const full_name = RandomGenerator.name(2);
  const joinResponse =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: {
        email: email,
        password_hash: password_hash,
        full_name: full_name,
        phone_number: null,
        profile_picture_url: null,
        email_verified: false,
      } satisfies IEventRegistrationRegularUser.ICreate,
    });
  typia.assert(joinResponse);

  // 2. Use the authorized user's ID and authentication (token handled by SDK) for notification query
  const notifiedUserId = joinResponse.id;

  // 3. Retrieve paginated notifications for the created user with default pagination params
  const notificationRequestBody = {
    page: 1,
    limit: 10,
    type: null,
    read: null,
  } satisfies IEventRegistrationNotifications.IRequest;

  const notificationsResponse =
    await api.functional.eventRegistration.regularUser.regularUsers.notifications.getNotifications(
      connection,
      {
        regularUserId: notifiedUserId,
        body: notificationRequestBody,
      },
    );
  typia.assert(notificationsResponse);

  // 4. Validate the pagination data and that notifications list is defined
  TestValidator.predicate(
    "notifications pagination current page should be 1",
    notificationsResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "notifications pagination limit should be 10",
    notificationsResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "notifications data should be an array",
    Array.isArray(notificationsResponse.data),
  );

  // 5. Additional checks can include validating read statuses, types presence if data exist
  if (notificationsResponse.data.length > 0) {
    for (const notification of notificationsResponse.data) {
      typia.assert(notification);
      TestValidator.predicate(
        "notification has a valid id",
        typeof notification.id === "string" && notification.id.length > 0,
      );
      TestValidator.predicate(
        "notification type is a string",
        typeof notification.type === "string",
      );
      TestValidator.predicate(
        "notification content is a string",
        typeof notification.content === "string",
      );
      TestValidator.predicate(
        "notification read property is boolean",
        typeof notification.read === "boolean",
      );
    }
  }
}
