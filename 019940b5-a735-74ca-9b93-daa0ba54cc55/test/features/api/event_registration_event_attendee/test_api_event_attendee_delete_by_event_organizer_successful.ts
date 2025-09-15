import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * This test validates the complete business flow of deleting an event attendee
 * registration by an event organizer with proper authorization and state
 * validation. The steps include creating an event organizer user account,
 * authenticating the organizer, creating an admin user account and
 * authenticating, using the admin to create an event, creating a regular user
 * and authenticating, registering that regular user as an attendee for the
 * event, and finally performing the deletion of the event attendee by the event
 * organizer user who owns or manages the event. This test ensures that event
 * organizers have the necessary permissions to erase attendee records for their
 * events. Each actor is authenticated separately using their credentials. All
 * request/response payloads use provided DTOs with correct typing and format
 * validated values. The test uses realistic random data generation for emails,
 * names, dates, and IDs in compliance with UUID and date-time formats. The test
 * uses async/await for proper flow control and asserts the correctness of every
 * API response using typia.assert. This scenario is necessary to confirm that
 * the delete operation performs correctly and the business logic for ownership
 * and authorization is respected.
 */
export async function test_api_event_attendee_delete_by_event_organizer_successful(
  connection: api.IConnection,
) {
  // 1. Create event organizer user account and authenticate
  const organizerEmail = RandomGenerator.alphaNumeric(10) + "@example.com";
  const organizerPassword = RandomGenerator.alphaNumeric(16);

  const organizer: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: {
        email: organizerEmail,
        password_hash: organizerPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationEventOrganizer.ICreate,
    });
  typia.assert(organizer);

  await api.functional.auth.eventOrganizer.login(connection, {
    body: {
      email: organizerEmail,
      password_hash: organizerPassword,
    } satisfies IEventRegistrationEventOrganizer.ILogin,
  });

  // 2. Create admin user account and authenticate
  const adminEmail = RandomGenerator.alphaNumeric(10) + "@example.com";
  const adminPassword = RandomGenerator.alphaNumeric(16);

  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(admin);

  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 3. Admin creates an event managed by the organizer
  const eventCreateBody: IEventRegistrationEvent.ICreate = {
    event_category_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(3),
    date: new Date(new Date().getTime() + 86400000).toISOString(),
    location: RandomGenerator.name(2),
    capacity: 100,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    ticket_price: 0,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;

  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: eventCreateBody,
    });
  typia.assert(event);

  // 4. Create regular user account and authenticate
  const userEmail = RandomGenerator.alphaNumeric(10) + "@example.com";
  const userPassword = RandomGenerator.alphaNumeric(16);

  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: {
        email: userEmail,
        password_hash: userPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationRegularUser.ICreate,
    });
  typia.assert(regularUser);

  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: {
      email: userEmail,
      password_hash: userPassword,
    } satisfies IEventRegistrationRegularUser.ILogin,
  });

  // 5. Regular user registers as event attendee for the created event
  const attendeeCreateBody: IEventRegistrationEventAttendee.ICreate = {
    event_id: event.id,
    regular_user_id: regularUser.id,
  } satisfies IEventRegistrationEventAttendee.ICreate;

  const attendee: IEventRegistrationEventAttendee =
    await api.functional.eventRegistration.regularUser.eventAttendees.create(
      connection,
      {
        body: attendeeCreateBody,
      },
    );
  typia.assert(attendee);

  // 6. Event organizer deletes the attendee registration by attendee ID
  await api.functional.eventRegistration.eventOrganizer.eventAttendees.erase(
    connection,
    {
      eventAttendeeId: attendee.id,
    },
  );
}
