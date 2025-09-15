import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationNotification";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationNotification";

/**
 * This E2E test validates the admin notifications retrieval functionality with
 * pagination and filtering.
 *
 * It includes creating a new admin, authenticating, then retrieving
 * notifications with page, limit, read filter, and search term. It asserts
 * correct pagination structure, valid notification UUIDs, timestamps, read
 * status, and content.
 *
 * The test ensures the admin notification management API behaves as expected
 * under typical conditions.
 */
export async function test_api_admin_notifications_retrieve_paginated(
  connection: api.IConnection,
) {
  // 1. Create a new admin user
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const adminCreated: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminCreated);

  // 2. Login as the created admin user
  const adminLoginBody = {
    email: adminCreateBody.email,
    password_hash: adminCreateBody.password_hash,
  } satisfies IEventRegistrationAdmin.ILogin;

  const adminLoggedIn: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 3. Retrieve notification pages with different params

  // Basic retrieval with defaults
  const defaultReqBody = {} satisfies IEventRegistrationNotification.IRequest;
  const defaultPage: IPageIEventRegistrationNotification.ISummary =
    await api.functional.eventRegistration.admin.notifications.indexNotifications(
      connection,
      {
        body: defaultReqBody,
      },
    );
  typia.assert(defaultPage);

  TestValidator.predicate(
    "pagination current page is non-negative",
    defaultPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    defaultPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    defaultPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    defaultPage.pagination.records >= 0,
  );

  // Each notification ID is valid UUID
  for (const n of defaultPage.data) {
    typia.assert(n);
    TestValidator.predicate(
      `notification id is uuid: ${n.id}`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        n.id,
      ),
    );
    // Confirm timestamps are ISO strings
    TestValidator.predicate(
      `notification created_at is ISO string: ${n.created_at}`,
      !isNaN(Date.parse(n.created_at)),
    );
    TestValidator.predicate(
      `notification updated_at is ISO string: ${n.updated_at}`,
      !isNaN(Date.parse(n.updated_at)),
    );
    // read is boolean
    TestValidator.predicate(
      `notification read is boolean: ${n.read}`,
      typeof n.read === "boolean",
    );
  }

  // 4. Test pagination with explicit page and limit
  const paginatedReqBody = {
    page: 1,
    limit: 5,
  } satisfies IEventRegistrationNotification.IRequest;

  const paginatedPage: IPageIEventRegistrationNotification.ISummary =
    await api.functional.eventRegistration.admin.notifications.indexNotifications(
      connection,
      {
        body: paginatedReqBody,
      },
    );
  typia.assert(paginatedPage);

  TestValidator.equals(
    "pagination current page equals requested",
    paginatedPage.pagination.current,
    paginatedReqBody.page ?? 0,
  );
  TestValidator.equals(
    "pagination limit equals requested",
    paginatedPage.pagination.limit,
    paginatedReqBody.limit ?? 0,
  );

  // 5. Test filtering for unread notifications
  const unreadFilterReqBody = {
    read: false,
  } satisfies IEventRegistrationNotification.IRequest;

  const unreadPage: IPageIEventRegistrationNotification.ISummary =
    await api.functional.eventRegistration.admin.notifications.indexNotifications(
      connection,
      {
        body: unreadFilterReqBody,
      },
    );
  typia.assert(unreadPage);

  for (const n of unreadPage.data) {
    TestValidator.equals(
      "notification read flag matches filter",
      n.read,
      false,
    );
  }

  // 6. Test search filtering by random substring from any notification's content
  if (defaultPage.data.length > 0) {
    const randomNotification = RandomGenerator.pick(defaultPage.data);
    const searchTerm = randomNotification.content.substring(
      0,
      Math.min(10, randomNotification.content.length),
    );
    const searchReqBody = {
      search: searchTerm,
    } satisfies IEventRegistrationNotification.IRequest;

    const searchPage: IPageIEventRegistrationNotification.ISummary =
      await api.functional.eventRegistration.admin.notifications.indexNotifications(
        connection,
        {
          body: searchReqBody,
        },
      );
    typia.assert(searchPage);

    for (const n of searchPage.data) {
      TestValidator.predicate(
        "notification content includes search term",
        n.content.includes(searchTerm),
      );
    }
  }
}
