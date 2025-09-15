import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import type { IEventRegistrationEventCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCategory";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * Test successful retrieval of an event attendee record by a regular user.
 *
 * Workflow:
 *
 * 1. Regular user joins and authenticates, obtaining tokens.
 * 2. Admin user joins and authenticates.
 * 3. Admin creates an event category with a unique name.
 * 4. Admin creates an event using the created category ID.
 * 5. Regular user authenticates again.
 * 6. Regular user registers as an attendee to the event.
 * 7. Regular user fetches the attendee record by own user ID and attendee ID.
 *
 * Validations check that all created and fetched records meet expected data
 * and proper authorization.
 */
export async function test_api_event_attendee_get_success_regular_user(
  connection: api.IConnection,
) {
  // 1. Regular user joins and authenticates
  const regularUserEmail = typia.random<string & tags.Format<"email">>();
  const regularUserPasswordHash = RandomGenerator.alphaNumeric(32);
  const regularUserJoinRequest = {
    email: regularUserEmail,
    password_hash: regularUserPasswordHash,
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationRegularUser.ICreate;
  const regularUserAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: regularUserJoinRequest,
    });
  typia.assert(regularUserAuthorized);

  // 2. Admin user joins and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = RandomGenerator.alphaNumeric(32);
  const adminJoinRequest = {
    email: adminEmail,
    password_hash: adminPasswordHash,
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;
  const adminAuthorized = await api.functional.auth.admin.join.createAdminUser(
    connection,
    {
      body: adminJoinRequest,
    },
  );
  typia.assert(adminAuthorized);

  // 3. Admin creates an event category
  const eventCategoryName = `category-${RandomGenerator.alphaNumeric(8)}`;
  const eventCategoryCreateRequest = {
    name: eventCategoryName,
    description: null,
  } satisfies IEventRegistrationEventCategory.ICreate;
  const eventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: eventCategoryCreateRequest,
      },
    );
  typia.assert(eventCategory);

  // 4. Admin creates an event with the created category ID
  const eventCreateRequest = {
    event_category_id: eventCategory.id,
    name: `event-${RandomGenerator.alphaNumeric(8)}`,
    date: new Date(Date.now() + 86400000).toISOString(), // one day future
    location: RandomGenerator.name(3),
    capacity: 100,
    description: null,
    ticket_price: 5000,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;
  const event = await api.functional.eventRegistration.admin.events.create(
    connection,
    {
      body: eventCreateRequest,
    },
  );
  typia.assert(event);

  // 5. Regular user logs in again to refresh authentication context
  const regularUserLoginRequest = {
    email: regularUserEmail,
    password_hash: regularUserPasswordHash,
  } satisfies IEventRegistrationRegularUser.ILogin;
  const regularUserLoggedIn =
    await api.functional.auth.regularUser.login.loginRegularUser(connection, {
      body: regularUserLoginRequest,
    });
  typia.assert(regularUserLoggedIn);

  // 6. Regular user registers as an attendee to the event
  const eventAttendeeCreateRequest = {
    event_id: event.id,
    regular_user_id: regularUserAuthorized.id,
  } satisfies IEventRegistrationEventAttendee.ICreate;
  const eventAttendee =
    await api.functional.eventRegistration.regularUser.eventAttendees.create(
      connection,
      {
        body: eventAttendeeCreateRequest,
      },
    );
  typia.assert(eventAttendee);

  // 7. Regular user fetches the attendee record by own user ID and event attendee ID
  const fetchedEventAttendee =
    await api.functional.eventRegistration.regularUser.regularUsers.attendees.atEventAttendeeByUser(
      connection,
      {
        regularUserId: regularUserAuthorized.id,
        eventAttendeeId: eventAttendee.id,
      },
    );
  typia.assert(fetchedEventAttendee);

  // Validations
  TestValidator.equals(
    "fetched attendee matches created",
    fetchedEventAttendee,
    eventAttendee,
  );
}
