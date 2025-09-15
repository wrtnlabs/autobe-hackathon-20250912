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
 * Test successful deletion of event attendee record by an event organizer.
 *
 * This E2E test covers the full flow of setting up necessary user roles
 * (admin, regular user, event organizer), creating an event category and
 * event, registering the regular user as an attendee, and then deleting the
 * attendee's record as the event organizer.
 *
 * The test verifies that the deletion request succeeds and the attendee
 * record is removed without errors. It demonstrates necessary
 * authentication context switching and correct DTO usage for each API.
 *
 * Steps:
 *
 * 1. Admin user creation and login.
 * 2. Creation of event category by admin.
 * 3. Creation of event under category.
 * 4. Regular user creation and login.
 * 5. Register regular user as event attendee.
 * 6. Event organizer creation and login.
 * 7. Event organizer deletes the attendee record.
 *
 * All data generated respects format and validation constraints such as
 * UUIDs and ISO 8601 date strings.
 */
export async function test_api_event_attendee_delete_by_event_organizer_success(
  connection: api.IConnection,
) {
  // 1. Create admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = "hashed_password_admin";
  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(adminUser);

  // 2. Admin login
  const adminLogin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
      } satisfies IEventRegistrationAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 3. Create event category as admin
  const eventCategoryCreateBody = {
    name: RandomGenerator.name(),
    description: null,
  } satisfies IEventRegistrationEventCategory.ICreate;

  const category: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: eventCategoryCreateBody,
      },
    );
  typia.assert(category);

  // 4. Create event as admin
  const eventCreateBody = {
    event_category_id: category.id,
    name: RandomGenerator.name(),
    date: new Date().toISOString(),
    location: RandomGenerator.name(),
    capacity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
    description: null,
    ticket_price: 0,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;

  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: eventCreateBody,
    });
  typia.assert(event);

  // 5. Create regular user
  const regularUserEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const regularUserPasswordHash = "hashed_password_regular";
  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: {
        email: regularUserEmail,
        password_hash: regularUserPasswordHash,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationRegularUser.ICreate,
    });
  typia.assert(regularUser);

  // 6. Regular user login
  const regularUserLogin: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login.loginRegularUser(connection, {
      body: {
        email: regularUserEmail,
        password_hash: regularUserPasswordHash,
      } satisfies IEventRegistrationRegularUser.ILogin,
    });
  typia.assert(regularUserLogin);

  // 7. Register regular user as attendee for event (by admin)
  const attendeeCreateBody = {
    event_id: event.id,
    regular_user_id: regularUser.id,
  } satisfies IEventRegistrationEventAttendee.ICreate;

  const attendee: IEventRegistrationEventAttendee =
    await api.functional.eventRegistration.admin.regularUsers.attendees.createEventAttendeeForUser(
      connection,
      {
        regularUserId: regularUser.id,
        body: attendeeCreateBody,
      },
    );
  typia.assert(attendee);

  // 8. Create event organizer user
  const organizerEmail: string = typia.random<string & tags.Format<"email">>();
  const organizerPasswordHash = "hashed_password_organizer";
  const eventOrganizer: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: {
        email: organizerEmail,
        password_hash: organizerPasswordHash,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationEventOrganizer.ICreate,
    });
  typia.assert(eventOrganizer);

  // 9. Event organizer login
  const eventOrganizerLogin: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.login(connection, {
      body: {
        email: organizerEmail,
        password_hash: organizerPasswordHash,
      } satisfies IEventRegistrationEventOrganizer.ILogin,
    });
  typia.assert(eventOrganizerLogin);

  // 10. Event organizer deletes the attendee record
  await api.functional.eventRegistration.eventOrganizer.regularUsers.attendees.erase(
    connection,
    {
      regularUserId: regularUser.id,
      eventAttendeeId: attendee.id,
    },
  );
}
