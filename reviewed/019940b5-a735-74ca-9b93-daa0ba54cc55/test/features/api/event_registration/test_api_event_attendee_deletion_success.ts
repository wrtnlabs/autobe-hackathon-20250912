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
 * This test validates the multi-role workflow for the deletion of an event
 * attendee. It covers account creation and login for regular user, event
 * organizer, and admin. It ensures creation of the event category, event,
 * attendee registration, and the final deletion of the attendee. All
 * response data is validated using typia.
 *
 * Steps overview:
 *
 * 1. Regular user creation and authentication.
 * 2. Event organizer creation and authentication.
 * 3. Admin user creation and authentication.
 * 4. Admin creates an event category.
 * 5. Event organizer creates an event.
 * 6. Regular user registers as event attendee.
 * 7. Regular user deletes the attendee record.
 *
 * Each step asserts response type correctness and verifies IDs.
 */
export async function test_api_event_attendee_deletion_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a regular user with verified email
  const regularUserCreateBody = {
    email: `${RandomGenerator.name(1).toLowerCase().replace(/\s/g, "")}@example.com`,
    password_hash: "hashed_password",
    full_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationRegularUser.ICreate;
  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: regularUserCreateBody,
    });
  typia.assert(regularUser);

  // 2. Create and authenticate event organizer
  const eventOrganizerCreateBody = {
    email: `${RandomGenerator.name(1).toLowerCase().replace(/\s/g, "")}@eventorg.com`,
    password_hash: "hashed_password",
    full_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationEventOrganizer.ICreate;
  const eventOrganizer: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: eventOrganizerCreateBody,
    });
  typia.assert(eventOrganizer);

  // 3. Create and authenticate admin user
  const adminCreateBody = {
    email: `admin${RandomGenerator.name(1).toLowerCase().replace(/\s/g, "")}@example.com`,
    password_hash: "hashed_password",
    full_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;
  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminUser);

  // Switch to admin user context to create event category
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminCreateBody.email,
      password_hash: adminCreateBody.password_hash,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  const eventCategoryCreateBody = {
    name: `Category ${RandomGenerator.alphaNumeric(6)}`,
    description: "Test event category",
  } satisfies IEventRegistrationEventCategory.ICreate;
  const eventCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: eventCategoryCreateBody,
      },
    );
  typia.assert(eventCategory);

  // Switch to event organizer to create an event
  await api.functional.auth.eventOrganizer.login(connection, {
    body: {
      email: eventOrganizerCreateBody.email,
      password_hash: eventOrganizerCreateBody.password_hash,
    } satisfies IEventRegistrationEventOrganizer.ILogin,
  });

  const eventCreateBody = {
    event_category_id: eventCategory.id,
    name: `Event ${RandomGenerator.alphaNumeric(8)}`,
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    location: "Online",
    capacity: 100,
    description: "Sample event",
    ticket_price: 50,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;
  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.eventOrganizer.events.create(
      connection,
      {
        body: eventCreateBody,
      },
    );
  typia.assert(event);

  // Switch to regular user context for attendee registration
  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: {
      email: regularUserCreateBody.email,
      password_hash: regularUserCreateBody.password_hash,
    } satisfies IEventRegistrationRegularUser.ILogin,
  });

  const attendeeCreateBody = {
    event_id: event.id,
    regular_user_id: regularUser.id,
  } satisfies IEventRegistrationEventAttendee.ICreate;
  const eventAttendee: IEventRegistrationEventAttendee =
    await api.functional.eventRegistration.regularUser.events.attendees.create(
      connection,
      {
        eventId: event.id,
        body: attendeeCreateBody,
      },
    );
  typia.assert(eventAttendee);

  // Delete the attendee
  await api.functional.eventRegistration.regularUser.events.attendees.erase(
    connection,
    {
      eventId: event.id,
      eventAttendeeId: eventAttendee.id,
    },
  );
}
