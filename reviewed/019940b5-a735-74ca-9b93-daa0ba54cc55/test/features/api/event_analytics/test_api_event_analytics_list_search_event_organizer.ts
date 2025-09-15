import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationEventAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAnalytics";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationEventAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventAnalytics";

export async function test_api_event_analytics_list_search_event_organizer(
  connection: api.IConnection,
) {
  // 1) Create an event organizer user account with realistic values
  const eventOrganizerCreate = {
    email: `organizer${Date.now()}@eventcorp.com`,
    password_hash: "hashed_password_example",
    full_name: "Event Organizer Test",
    phone_number: null,
    profile_picture_url: null,
    email_verified: false,
  } satisfies IEventRegistrationEventOrganizer.ICreate;

  const eventOrganizer: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: eventOrganizerCreate,
    });
  typia.assert(eventOrganizer);

  // 2) Query event analytics list with pagination and filtering
  const analyticsRequest = {
    page: 1,
    limit: 10,
  } satisfies IEventRegistrationEventAnalytics.IRequest;

  const analyticsResponse: IPageIEventRegistrationEventAnalytics.ISummary =
    await api.functional.eventRegistration.eventOrganizer.eventAnalytics.index(
      connection,
      {
        body: analyticsRequest,
      },
    );
  typia.assert(analyticsResponse);

  // 3) Validate pagination structure
  TestValidator.predicate(
    "pagination current page must be 1 or higher",
    analyticsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit must be positive",
    analyticsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records must be non-negative",
    analyticsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages must be non-negative",
    analyticsResponse.pagination.pages >= 0,
  );

  // 4) Validate data array matches pagination limit
  TestValidator.predicate(
    "data length must not exceed pagination limit",
    analyticsResponse.data.length <= analyticsResponse.pagination.limit,
  );

  // 5) Validate each analytics item
  for (const summary of analyticsResponse.data) {
    typia.assert(summary);
    TestValidator.predicate(
      "total sign ups non-negative",
      summary.total_sign_ups >= 0,
    );
    TestValidator.predicate(
      "waitlist length non-negative",
      summary.waitlist_length >= 0,
    );
    TestValidator.predicate(
      "popularity workshop non-negative",
      summary.popularity_category_workshop >= 0,
    );
    TestValidator.predicate(
      "popularity seminar non-negative",
      summary.popularity_category_seminar >= 0,
    );
    TestValidator.predicate(
      "popularity social non-negative",
      summary.popularity_category_social >= 0,
    );
    TestValidator.predicate(
      "popularity networking non-negative",
      summary.popularity_category_networking >= 0,
    );
    // Timestamp checks for created_at and updated_at
    TestValidator.predicate(
      "created_at must be a valid ISO date",
      !Number.isNaN(Date.parse(summary.created_at)),
    );
    TestValidator.predicate(
      "updated_at must be a valid ISO date",
      !Number.isNaN(Date.parse(summary.updated_at)),
    );
  }
}
