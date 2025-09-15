import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventAttendee";

/**
 * Test that an authenticated regular user can retrieve their paginated list of
 * event attendee records.
 *
 * This test performs the following steps:
 *
 * 1. Create and authenticate a regular user to obtain the user ID and
 *    authentication context.
 * 2. Create several event attendee records associated with the regular user.
 * 3. Query the event attendee list for the regular user using the paginated API
 *    endpoint.
 * 4. Validate the pagination metadata and verify that all returned attendees
 *    belong to the created user.
 */
export async function test_api_event_attendee_index_by_regular_user_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a regular user
  const userCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: userCreateBody,
    });
  typia.assert(regularUser);

  // 2. Create multiple event attendee records for the regular user
  const eventIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  for (const eventId of eventIds) {
    const attendeeCreateBody = {
      event_id: eventId,
      regular_user_id: regularUser.id,
    } satisfies IEventRegistrationEventAttendee.ICreate;

    const attendee =
      await api.functional.eventRegistration.regularUser.regularUsers.attendees.createEventAttendeeForUser(
        connection,
        {
          regularUserId: regularUser.id,
          body: attendeeCreateBody,
        },
      );
    typia.assert(attendee);
    TestValidator.equals(
      "attendee regular_user_id must match created user",
      attendee.regular_user_id,
      regularUser.id,
    );
  }

  // 3. Query paginated event attendee list for the regular user
  const attendeesPage =
    await api.functional.eventRegistration.regularUser.regularUsers.attendees.indexEventAttendeesByUser(
      connection,
      {
        regularUserId: regularUser.id,
        body: {
          page: 1,
          limit: 10,
          regular_user_id: regularUser.id,
        } satisfies IEventRegistrationEventAttendee.IRequest,
      },
    );
  typia.assert(attendeesPage);

  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    attendeesPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    attendeesPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records is >= created attendees",
    attendeesPage.pagination.records >= eventIds.length,
  );
  TestValidator.predicate(
    "pagination pages is >= 1",
    attendeesPage.pagination.pages >= 1,
  );

  // 5. Validate each attendee entry belongs to the created regular user
  for (const attendee of attendeesPage.data) {
    typia.assert(attendee);
    TestValidator.equals(
      "attendee regular_user_id check",
      attendee.regular_user_id,
      regularUser.id,
    );
    TestValidator.predicate(
      "attendee event_id is defined",
      typeof attendee.event_id === "string" && attendee.event_id.length > 0,
    );
  }
}
