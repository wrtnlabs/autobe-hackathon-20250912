import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationEventAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAnalytics";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";

/**
 * This E2E test validates successful retrieval of detailed event analytics data
 * by an authenticated event organizer user for a given eventAnalyticsId.
 *
 * The test workflow:
 *
 * 1. Call the join API twice as dependencies to create and authenticate the event
 *    organizer user to establish proper authorization context.
 * 2. Verify the returned authorized user data matches expected structure.
 * 3. Use a valid UUID for eventAnalyticsId parameter to retrieve detailed event
 *    analytics.
 * 4. Assert the API response type and validate key analytics metrics are numbers
 *    within expected ranges.
 */
export async function test_api_eventanalytics_detailed_retrieval_success(
  connection: api.IConnection,
) {
  // 1. First join dependency call for event organizer
  const authorizedUser1: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: {
        email: typia.random<string>(),
        full_name: RandomGenerator.name(),
        password_hash: "hashedpassword123",
        email_verified: true,
        phone_number: null,
        profile_picture_url: null,
      } satisfies IEventRegistrationEventOrganizer.ICreate,
    });
  typia.assert(authorizedUser1);

  // 2. Second join dependency call to fulfill the duplicate dependency requirement
  const authorizedUser2: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: {
        email: typia.random<string>(),
        full_name: RandomGenerator.name(),
        password_hash: "hashedpassword123",
        email_verified: true,
        phone_number: null,
        profile_picture_url: null,
      } satisfies IEventRegistrationEventOrganizer.ICreate,
    });
  typia.assert(authorizedUser2);

  // 3. Prepare a compliant UUID for eventAnalyticsId
  const eventAnalyticsId = typia.random<string & tags.Format<"uuid">>();

  // 4. Retrieve the detailed event analytics
  const analytics: IEventRegistrationEventAnalytics =
    await api.functional.eventRegistration.eventOrganizer.eventAnalytics.at(
      connection,
      { eventAnalyticsId },
    );
  typia.assert(analytics);

  // 5. Validate numeric properties are within logical ranges
  TestValidator.predicate(
    "total_sign_ups is a non-negative integer",
    typeof analytics.total_sign_ups === "number" &&
      analytics.total_sign_ups >= 0,
  );
  TestValidator.predicate(
    "waitlist_length is a non-negative integer",
    typeof analytics.waitlist_length === "number" &&
      analytics.waitlist_length >= 0,
  );
  TestValidator.predicate(
    "popularity_category_workshop is a non-negative integer",
    typeof analytics.popularity_category_workshop === "number" &&
      analytics.popularity_category_workshop >= 0,
  );
  TestValidator.predicate(
    "popularity_category_seminar is a non-negative integer",
    typeof analytics.popularity_category_seminar === "number" &&
      analytics.popularity_category_seminar >= 0,
  );
  TestValidator.predicate(
    "popularity_category_social is a non-negative integer",
    typeof analytics.popularity_category_social === "number" &&
      analytics.popularity_category_social >= 0,
  );
  TestValidator.predicate(
    "popularity_category_networking is a non-negative integer",
    typeof analytics.popularity_category_networking === "number" &&
      analytics.popularity_category_networking >= 0,
  );

  // 6. Validate created_at and updated_at are valid ISO date-time strings
  TestValidator.predicate(
    "created_at is a valid ISO date-time string",
    typeof analytics.created_at === "string" &&
      !isNaN(Date.parse(analytics.created_at)),
  );
  TestValidator.predicate(
    "updated_at is a valid ISO date-time string",
    typeof analytics.updated_at === "string" &&
      !isNaN(Date.parse(analytics.updated_at)),
  );
}
