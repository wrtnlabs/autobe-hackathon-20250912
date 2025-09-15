import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import type { IEventRegistrationEventCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCategory";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * This E2E test validates the complete successful workflow of creating a new
 * event attendee for a regular user.
 *
 * Stepwise workflow:
 *
 * 1. Create a new regular user by joining.
 * 2. Create a new admin user and login.
 * 3. Create a new event category as admin.
 * 4. Create a new event organizer user and login.
 * 5. Create a new event as the event organizer.
 * 6. Log in as the regular user.
 * 7. Register the regular user as an event attendee for the created event.
 * 8. Validate the attendee record properties.
 */
export async function test_api_event_attendee_creation_success(
  connection: api.IConnection,
) {
  // 1. Create regular user
  const regularUserBody = {
    email: `user${Date.now()}@example.com`,
    password_hash: "hashed-password",
    full_name: "Regular User",
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const regularUser =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: regularUserBody,
    });
  typia.assert(regularUser);

  // 2. Create admin
  const adminBody = {
    email: `admin${Date.now()}@example.com`,
    password_hash: "hashed-password",
    full_name: "Admin User",
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;
  const admin = await api.functional.auth.admin.join.createAdminUser(
    connection,
    {
      body: adminBody,
    },
  );
  typia.assert(admin);

  // Admin login
  const adminLoginBody = {
    email: admin.email,
    password_hash: "hashed-password",
  } satisfies IEventRegistrationAdmin.ILogin;
  const adminLoggedIn = await api.functional.auth.admin.login.loginAdminUser(
    connection,
    {
      body: adminLoginBody,
    },
  );
  typia.assert(adminLoggedIn);

  // 3. Create event category as admin
  const eventCategoryBody = {
    name: `Category${Date.now()}`,
    description: "Test event category",
  } satisfies IEventRegistrationEventCategory.ICreate;

  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: adminLoginBody,
  });

  const eventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: eventCategoryBody,
      },
    );
  typia.assert(eventCategory);

  // 4. Create event organizer user
  const eventOrganizerBody = {
    email: `organizer${Date.now()}@example.com`,
    password_hash: "hashed-password",
    full_name: "Event Organizer",
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationEventOrganizer.ICreate;
  const eventOrganizer = await api.functional.auth.eventOrganizer.join(
    connection,
    {
      body: eventOrganizerBody,
    },
  );
  typia.assert(eventOrganizer);

  // Event organizer login
  const eventOrganizerLoginBody = {
    email: eventOrganizer.email,
    password_hash: "hashed-password",
  } satisfies IEventRegistrationEventOrganizer.ILogin;
  const eventOrganizerLoggedIn = await api.functional.auth.eventOrganizer.login(
    connection,
    {
      body: eventOrganizerLoginBody,
    },
  );
  typia.assert(eventOrganizerLoggedIn);

  // 5. Create event as event organizer
  const eventBody = {
    event_category_id: eventCategory.id,
    name: `Event${Date.now()}`,
    date: new Date(Date.now() + 86400000).toISOString(),
    location: "Conference Hall",
    capacity: 100,
    description: "Event Description",
    ticket_price: 0,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;

  const event =
    await api.functional.eventRegistration.eventOrganizer.events.create(
      connection,
      {
        body: eventBody,
      },
    );
  typia.assert(event);

  // 6. Switch to regular user context (login if necessary)
  const regularUserLoginBody = {
    email: regularUser.email,
    password_hash: "hashed-password",
  } satisfies IEventRegistrationRegularUser.ILogin;
  const regularUserLoggedIn =
    await api.functional.auth.regularUser.login.loginRegularUser(connection, {
      body: regularUserLoginBody,
    });
  typia.assert(regularUserLoggedIn);

  // 7. Create event attendee as regular user
  const attendeeCreateBody = {
    event_id: event.id,
    regular_user_id: regularUser.id,
  } satisfies IEventRegistrationEventAttendee.ICreate;

  const attendee =
    await api.functional.eventRegistration.regularUser.events.attendees.create(
      connection,
      {
        eventId: event.id,
        body: attendeeCreateBody,
      },
    );
  typia.assert(attendee);

  // 8. Validate attendee fields
  TestValidator.equals(
    "attendee.event_id matches event",
    attendee.event_id,
    event.id,
  );
  TestValidator.equals(
    "attendee.regular_user_id matches regularUser",
    attendee.regular_user_id,
    regularUser.id,
  );
  TestValidator.predicate(
    "attendee.created_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(attendee.created_at),
  );
  TestValidator.predicate(
    "attendee.updated_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(attendee.updated_at),
  );
}
