import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventAttendee";

/**
 * This test ensures that an event organizer can query event attendees with
 * filtering and pagination.
 *
 * Key Steps:
 *
 * 1. Create an event organizer account by invoking the join endpoint to
 *    establish authentication.
 * 2. Use the event organizer authentication to call the event attendee search
 *    endpoint.
 * 3. Send a request body with pagination parameters such as page and limit.
 * 4. Optionally include some filter parameters (for test, set to null).
 * 5. Assert the returned pagination metadata is consistent and attendees list
 *    data adheres to expected summary structure.
 * 6. Validate UUID and date-time formats of items in the response.
 */
export async function test_api_event_attendee_search_by_event_organizer(
  connection: api.IConnection,
) {
  // 1. Event organizer signup and authentication
  const eventOrganizerCreateBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(16),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationEventOrganizer.ICreate;

  const eventOrganizer: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: eventOrganizerCreateBody,
    });

  typia.assert(eventOrganizer);

  // 2. Prepare search request for event attendees
  const attendeesRequestBody = {
    page: 1,
    limit: 10,
    event_id: null,
    regular_user_id: null,
    created_at: null,
  } satisfies IEventRegistrationEventAttendee.IRequest;

  // 3. Perform the attendee search query
  const attendeePage: IPageIEventRegistrationEventAttendee.ISummary =
    await api.functional.eventRegistration.eventOrganizer.eventAttendees.index(
      connection,
      {
        body: attendeesRequestBody,
      },
    );

  typia.assert(attendeePage);

  // 4. Validate pagination information
  const pagination: IPage.IPagination = attendeePage.pagination;

  TestValidator.predicate(
    "pagination current positive",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit positive", pagination.limit >= 1);
  TestValidator.predicate(
    "pagination records non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages consistent",
    pagination.pages === Math.ceil(pagination.records / pagination.limit),
  );

  // 5. Validate attendee data list
  for (const attendee of attendeePage.data) {
    // Validate UUID formats
    typia.assert<string & tags.Format<"uuid">>(attendee.id);
    typia.assert<string & tags.Format<"uuid">>(attendee.event_id);
    typia.assert<string & tags.Format<"uuid">>(attendee.regular_user_id);

    // Validate date-time format
    typia.assert<string & tags.Format<"date-time">>(attendee.created_at);
  }

  // 6. Basic check that data is array
  TestValidator.predicate(
    "attendee data is array",
    Array.isArray(attendeePage.data),
  );

  // 7. Data consistency: Ensure count of attendees does not exceed limit
  TestValidator.predicate(
    "attendee list size lesser or equal to limit",
    attendeePage.data.length <= pagination.limit,
  );
}
