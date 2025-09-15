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
 * Test successful update of event attendee record by a regular user with
 * valid data and proper authorization. The scenario involves creating a new
 * regular user account with email and password via /auth/regularUser/join.
 * A new event category and event are created by an admin user. The regular
 * user then registers as an attendee for the event via
 * /eventRegistration/regularUser/eventAttendees. The eventAttendeeId from
 * the created attendee record is used to update the attendee record with
 * updated timestamps. The scenario validates that the update succeeds with
 * correct data returned. Authentication context switches from regular user
 * for attendee creation to admin as needed for setup.
 */
export async function test_api_event_attendee_update_by_regular_user_success(
  connection: api.IConnection,
) {
  // 1. Create a new regular user account via join API
  const regularUserEmail = `${RandomGenerator.name(1)}@example.com`;
  const regularUserPassword = `P@ssw0rd${RandomGenerator.alphaNumeric(5)}`;
  const regularUser =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: {
        email: regularUserEmail,
        password_hash: regularUserPassword,
        full_name: RandomGenerator.name(),
        phone_number: null,
        profile_picture_url: null,
        email_verified: false,
      } satisfies IEventRegistrationRegularUser.ICreate,
    });
  typia.assert(regularUser);

  // 2. Create and authenticate an admin user for event setup
  const adminEmail = `${RandomGenerator.name(1)}@example.com`;
  const adminPassword = `P@ssw0rd${RandomGenerator.alphaNumeric(5)}`;
  const adminUser = await api.functional.auth.admin.join.createAdminUser(
    connection,
    {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    },
  );
  typia.assert(adminUser);

  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 3. Create a new event category by admin
  const eventCategoryName = RandomGenerator.name(1);
  const eventCategoryDescription = RandomGenerator.paragraph({ sentences: 5 });
  const eventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: {
          name: eventCategoryName,
          description: eventCategoryDescription,
        } satisfies IEventRegistrationEventCategory.ICreate,
      },
    );
  typia.assert(eventCategory);

  // 4. Create a new event by admin
  const eventName = RandomGenerator.name(2);
  const eventDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days from now
  const eventLocation = `${RandomGenerator.name(1)} Venue`;
  const eventCapacity = 100;
  const eventTicketPrice = 5000;
  const eventStatus = "scheduled" as const;
  const event = await api.functional.eventRegistration.admin.events.create(
    connection,
    {
      body: {
        event_category_id: eventCategory.id,
        name: eventName,
        date: eventDate,
        location: eventLocation,
        capacity: eventCapacity,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        ticket_price: eventTicketPrice,
        status: eventStatus,
      } satisfies IEventRegistrationEvent.ICreate,
    },
  );
  typia.assert(event);

  // 5. Switch to regular user authentication to register attendee
  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: {
      email: regularUserEmail,
      password_hash: regularUserPassword,
    } satisfies IEventRegistrationRegularUser.ILogin,
  });

  const attendee =
    await api.functional.eventRegistration.regularUser.eventAttendees.create(
      connection,
      {
        body: {
          event_id: event.id,
          regular_user_id: regularUser.id,
        } satisfies IEventRegistrationEventAttendee.ICreate,
      },
    );
  typia.assert(attendee);

  // 6. Update the attendee record with new timestamps
  const nowIso = new Date().toISOString();
  const updateBody: IEventRegistrationEventAttendee.IUpdate = {
    created_at: attendee.created_at, // keep original
    updated_at: nowIso, // update to current time
  };

  const updatedAttendee =
    await api.functional.eventRegistration.regularUser.regularUsers.attendees.update(
      connection,
      {
        regularUserId: regularUser.id,
        eventAttendeeId: attendee.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAttendee);

  TestValidator.equals(
    "attendee id should match",
    updatedAttendee.id,
    attendee.id,
  );
  TestValidator.equals(
    "attendee event id should match",
    updatedAttendee.event_id,
    event.id,
  );
  TestValidator.equals(
    "attendee regular user id should match",
    updatedAttendee.regular_user_id,
    regularUser.id,
  );
  TestValidator.equals(
    "attendee created_at should be unchanged",
    updatedAttendee.created_at,
    attendee.created_at,
  );
  TestValidator.equals(
    "attendee updated_at should be updated",
    updatedAttendee.updated_at,
    nowIso,
  );
}
