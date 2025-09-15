import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationNotification";

/**
 * Test to check regular user's paginated notification retrieval.
 *
 * Scenario steps:
 *
 * 1. Create a new regular user by invoking join API with realistic user data.
 * 2. Authenticate the regular user to establish session context.
 * 3. Retrieve notifications with default pagination parameters.
 * 4. Retrieve notifications using custom page and limit values to verify
 *    pagination behavior.
 * 5. Retrieve notifications filtered by read status true and false separately.
 * 6. Retrieve notifications filtered by a sample search keyword.
 * 7. Validate each response conforms to the expected paginated notification
 *    schema.
 */
export async function test_api_regular_user_notifications_retrieve_paginated(
  connection: api.IConnection,
) {
  // 1. Create a new regular user with valid realistic data
  const userCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: false,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const authorizedUser =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Authenticate the regular user to establish context (login)
  const userLoginBody = {
    email: userCreateBody.email,
    password_hash: userCreateBody.password_hash,
  } satisfies IEventRegistrationRegularUser.ILogin;

  const loggedInUser =
    await api.functional.auth.regularUser.login.loginRegularUser(connection, {
      body: userLoginBody,
    });
  typia.assert(loggedInUser);

  // 3. Retrieve notifications with default pagination parameters
  let requestBody = {} satisfies IEventRegistrationNotification.IRequest;
  let notificationsPage =
    await api.functional.eventRegistration.regularUser.notifications.indexNotifications(
      connection,
      { body: requestBody },
    );
  typia.assert(notificationsPage);

  // 4. Retrieve notifications page 1, limit 5 to check pagination
  requestBody = {
    page: 1,
    limit: 5,
  } satisfies IEventRegistrationNotification.IRequest;
  notificationsPage =
    await api.functional.eventRegistration.regularUser.notifications.indexNotifications(
      connection,
      { body: requestBody },
    );
  typia.assert(notificationsPage);
  TestValidator.predicate(
    "pagination limit should be exactly 5",
    notificationsPage.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination current page should be 1",
    notificationsPage.pagination.current === 1,
  );

  // 5. Retrieve notifications filtered by read = true
  requestBody = {
    read: true,
  } satisfies IEventRegistrationNotification.IRequest;
  notificationsPage =
    await api.functional.eventRegistration.regularUser.notifications.indexNotifications(
      connection,
      { body: requestBody },
    );
  typia.assert(notificationsPage);

  // 6. Retrieve notifications filtered by read = false
  requestBody = {
    read: false,
  } satisfies IEventRegistrationNotification.IRequest;
  notificationsPage =
    await api.functional.eventRegistration.regularUser.notifications.indexNotifications(
      connection,
      { body: requestBody },
    );
  typia.assert(notificationsPage);

  // 7. Retrieve notifications filtered by search keyword (using substring)
  // Use a search keyword from previous page data if possible
  const notificationsData = notificationsPage.data;
  if (notificationsData.length > 0) {
    const sampleNotification = RandomGenerator.pick(notificationsData);
    const sampleContentSubstring = sampleNotification.content.substring(0, 5);

    requestBody = {
      search: sampleContentSubstring,
    } satisfies IEventRegistrationNotification.IRequest;

    notificationsPage =
      await api.functional.eventRegistration.regularUser.notifications.indexNotifications(
        connection,
        { body: requestBody },
      );
    typia.assert(notificationsPage);

    // Validate that all returned notifications contain the search term
    for (const notification of notificationsPage.data) {
      TestValidator.predicate(
        `notification content includes search term '${sampleContentSubstring}'`,
        notification.content.includes(sampleContentSubstring),
      );
    }
  }
}
