import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEventAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAnalytics";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationEventAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventAnalytics";

/**
 * Test admin event analytics listing and searching.
 *
 * This test performs the following:
 *
 * 1. Create and authenticate an admin user via /auth/admin/join.
 * 2. Query the event analytics list with filter and pagination parameters
 *    using PATCH /eventRegistration/admin/eventAnalytics.
 * 3. Verify the event analytics pagination and filtering correctness.
 * 4. Confirm unauthorized access is rejected for the event analytics endpoint.
 */
export async function test_api_event_analytics_list_search_admin(
  connection: api.IConnection,
) {
  // 1. Create admin user and authenticate
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: false,
  } satisfies IEventRegistrationAdmin.ICreate;

  const adminAuthorized: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // Use the same connection with authorization header managed by SDK

  // 2. Query event analytics list with various filters and pagination
  const analyticsQueryBody1 = {
    event_registration_event_id: null,
    page: 1,
    limit: 5,
    created_after: null,
    created_before: null,
  } satisfies IEventRegistrationEventAnalytics.IRequest;

  const analyticsPage1: IPageIEventRegistrationEventAnalytics.ISummary =
    await api.functional.eventRegistration.admin.eventAnalytics.index(
      connection,
      {
        body: analyticsQueryBody1,
      },
    );
  typia.assert(analyticsPage1);

  // Validate pagination consistency
  TestValidator.predicate(
    "pagination.current is page 1",
    analyticsPage1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination.limit is 5",
    analyticsPage1.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    analyticsPage1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    analyticsPage1.pagination.records >= 0,
  );

  // Validate data array size <= limit
  TestValidator.predicate(
    "data.length <= limit",
    analyticsPage1.data.length <= analyticsPage1.pagination.limit,
  );

  // 3. Query filtering with event_registration_event_id and date range if data is present
  if (analyticsPage1.data.length > 0) {
    const someEventId = analyticsPage1.data[0].event_registration_event_id;
    const creationDate = analyticsPage1.data[0].created_at;

    const createdAfterDate = creationDate;
    // Create a created_before date slightly after createdAfterDate
    const createdBeforeDate = new Date(
      new Date(createdAfterDate).getTime() + 1000 * 60 * 60,
    ).toISOString();

    const analyticsQueryBody2 = {
      event_registration_event_id: someEventId,
      page: 1,
      limit: 10,
      created_after: createdAfterDate,
      created_before: createdBeforeDate,
    } satisfies IEventRegistrationEventAnalytics.IRequest;

    const analyticsFiltered: IPageIEventRegistrationEventAnalytics.ISummary =
      await api.functional.eventRegistration.admin.eventAnalytics.index(
        connection,
        {
          body: analyticsQueryBody2,
        },
      );
    typia.assert(analyticsFiltered);

    // Validate pagination fields
    TestValidator.predicate(
      "filtered pagination current is page 1",
      analyticsFiltered.pagination.current === 1,
    );
    TestValidator.predicate(
      "filtered pagination limit is 10",
      analyticsFiltered.pagination.limit === 10,
    );

    // Validate filtered data
    for (const summary of analyticsFiltered.data) {
      TestValidator.equals(
        "filtered event_registration_event_id matches",
        summary.event_registration_event_id,
        someEventId,
      );
      TestValidator.predicate(
        "created_at >= created_after",
        summary.created_at >= createdAfterDate,
      );
      TestValidator.predicate(
        "created_at <= created_before",
        summary.created_at <= createdBeforeDate,
      );
    }
  }

  // 4. Verify unauthorized access is denied
  // Use a new unauthenticated connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthorized access throws error", async () => {
    await api.functional.eventRegistration.admin.eventAnalytics.index(
      unauthenticatedConnection,
      {
        body: {
          event_registration_event_id: null,
          page: 1,
          limit: 3,
          created_after: null,
          created_before: null,
        } satisfies IEventRegistrationEventAnalytics.IRequest,
      },
    );
  });
}
