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
 * This test verifies the complete workflow of updating an event attendee record
 * within a multi-role authentication scenario.
 *
 * It starts by creating and authenticating various user roles needed for the
 * test: regular user, event organizer, and admin. Next it creates an event
 * category and an event, then registers the regular user as an attendee to that
 * event. Finally, it updates the attendee record using valid update data and
 * checks that the updated data returned matches the expectations.
 *
 * This comprehensive test ensures that role-based authentication, resource
 * creation, registration, and update functionality are correctly implemented
 * and integrated.
 */
export async function test_api_event_attendee_update_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a regular user
  const regularUserCreateBody = {
    email: `user_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: regularUserCreateBody,
    });
  typia.assert(regularUser);

  // 2. Create and authenticate an event organizer
  const eventOrganizerCreateBody = {
    email: `organizer_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationEventOrganizer.ICreate;

  const eventOrganizer: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: eventOrganizerCreateBody,
    });
  typia.assert(eventOrganizer);

  // 3. Switch Authentication to admin user and create admin account
  const adminCreateBody = {
    email: `admin_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminUser);

  // 4. Authenticate as admin user explicitly to create event category
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminCreateBody.email,
      password_hash: adminCreateBody.password_hash,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 5. Create a new event category
  const eventCategoryCreateBody = {
    name: `category_${RandomGenerator.alphaNumeric(3)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IEventRegistrationEventCategory.ICreate;

  const eventCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: eventCategoryCreateBody,
      },
    );
  typia.assert(eventCategory);

  // 6. Authenticate as event organizer user explicitly before event creation
  await api.functional.auth.eventOrganizer.login(connection, {
    body: {
      email: eventOrganizerCreateBody.email,
      password_hash: eventOrganizerCreateBody.password_hash,
    } satisfies IEventRegistrationEventOrganizer.ILogin,
  });

  // 7. Create a new event with the created category
  const nowISOString = new Date().toISOString();
  const eventCreateBody = {
    event_category_id: eventCategory.id,
    name: `Event ${RandomGenerator.alphaNumeric(5)}`,
    date: nowISOString,
    location: `Location ${RandomGenerator.alphaNumeric(5)}`,
    capacity: 100,
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 8. Authenticate as regular user before attendee registration
  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: {
      email: regularUserCreateBody.email,
      password_hash: regularUserCreateBody.password_hash,
    } satisfies IEventRegistrationRegularUser.ILogin,
  });

  // 9. Register the regular user as an attendee
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

  // 10. Update the event attendee record with valid update data
  const updateBody: IEventRegistrationEventAttendee.IUpdate = {
    // Partial update: change timestamps to new ISO date strings to simulate record modification
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  const updatedAttendee: IEventRegistrationEventAttendee =
    await api.functional.eventRegistration.regularUser.events.attendees.update(
      connection,
      {
        eventId: event.id,
        eventAttendeeId: eventAttendee.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAttendee);

  // 11. Validate the updated attendee data matches updateBody where defined
  TestValidator.equals(
    "event attendee id matches",
    updatedAttendee.id,
    eventAttendee.id,
  );
  TestValidator.equals("event id matches", updatedAttendee.event_id, event.id);
  TestValidator.equals(
    "regular user id matches",
    updatedAttendee.regular_user_id,
    regularUser.id,
  );
  if (updateBody.created_at !== null && updateBody.created_at !== undefined) {
    TestValidator.equals(
      "created_at updated",
      updatedAttendee.created_at,
      updateBody.created_at,
    );
  }
  if (updateBody.updated_at !== null && updateBody.updated_at !== undefined) {
    TestValidator.equals(
      "updated_at updated",
      updatedAttendee.updated_at,
      updateBody.updated_at,
    );
  }
}
