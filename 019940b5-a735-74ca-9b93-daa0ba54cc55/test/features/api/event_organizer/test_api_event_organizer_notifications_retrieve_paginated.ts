import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";
import type { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationNotification";

/**
 * Validates the notification retrieval pagination and filtering for event
 * organizer users.
 *
 * This test covers the full authentication and authorization prerequisites:
 *
 * 1. Event organizer account registration (join)
 * 2. Event organizer login authentication
 *
 * After authentication, it tests retrieving notifications through paginated
 * queries with various filter conditions such as read status and search
 * terms to verify the notification management API behavior.
 *
 * Validations include strict type assertions and test validators ensuring
 * response data integrity and business rule compliance.
 */
export async function test_api_event_organizer_notifications_retrieve_paginated(
  connection: api.IConnection,
) {
  // 1. Create event organizer user account (join)
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationEventOrganizer.ICreate;

  const eventOrganizer: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: userCreateBody,
    });
  typia.assert(eventOrganizer);

  // 2. Authenticate as event organizer user (login)
  const userLoginBody = {
    email: eventOrganizer.email,
    password_hash: userCreateBody.password_hash,
  } satisfies IEventRegistrationEventOrganizer.ILogin;

  const authorizedUser: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.login(connection, {
      body: userLoginBody,
    });
  typia.assert(authorizedUser);

  // 3. Retrieve notifications - first page with default filters
  const firstPageRequest = {
    page: 1,
    limit: 10,
    read: null,
    search: null,
  } satisfies IEventRegistrationNotification.IRequest;

  const firstPageData: IPageIEventRegistrationNotification.ISummary =
    await api.functional.eventRegistration.eventOrganizer.notifications.indexNotifications(
      connection,
      { body: firstPageRequest },
    );
  typia.assert(firstPageData);

  TestValidator.predicate(
    "first page: should have pagination info",
    firstPageData.pagination !== null &&
      typeof firstPageData.pagination.current === "number",
  );

  // 4. Retrieve notifications - second page, filtering unread notifications
  const unreadPageRequest = {
    page: 2,
    limit: 5,
    read: false,
    search: null,
  } satisfies IEventRegistrationNotification.IRequest;

  const unreadPageData: IPageIEventRegistrationNotification.ISummary =
    await api.functional.eventRegistration.eventOrganizer.notifications.indexNotifications(
      connection,
      { body: unreadPageRequest },
    );
  typia.assert(unreadPageData);

  TestValidator.predicate(
    "second page: unread notifications should have read:false",
    unreadPageData.data.every((n) => n.read === false),
  );

  // 5. Retrieve notifications - search with a random keyword string
  const searchKeyword = RandomGenerator.substring(
    "notification message example content validation",
  );

  const searchPageRequest = {
    page: 1,
    limit: 10,
    read: null,
    search: searchKeyword,
  } satisfies IEventRegistrationNotification.IRequest;

  const searchPageData: IPageIEventRegistrationNotification.ISummary =
    await api.functional.eventRegistration.eventOrganizer.notifications.indexNotifications(
      connection,
      { body: searchPageRequest },
    );
  typia.assert(searchPageData);

  TestValidator.predicate(
    "search page: notification content or type to include search keyword",
    searchPageData.data.every(
      (n) =>
        n.content.includes(searchKeyword) || n.type.includes(searchKeyword),
    ),
  );
}
