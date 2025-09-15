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
 * E2E test for the registration of a regular user as an attendee of an event.
 *
 * This test covers the full scenario from creating new regular and admin user
 * accounts with verified emails, to admin user creating event category and
 * event, and finally registering the regular user as an attendee.
 *
 * Steps:
 *
 * 1. Register a regular user with verified email.
 * 2. Register an admin user with verified email.
 * 3. Authenticate the admin user.
 * 4. Create event category via admin.
 * 5. Create event under the category via admin.
 * 6. Register the regular user as an attendee to the event.
 * 7. Validate that the attendee record correctly associates the user and event.
 * 8. Validate attendee created_at and updated_at timestamps are well-formed.
 */
export async function test_api_regular_user_attendee_registration_success(
  connection: api.IConnection,
) {
  // 1. Register a new regular user with verified email
  const regularUserBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(20),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: regularUserBody,
    });
  typia.assert(regularUser);

  // 2. Create an admin user and authenticate
  const adminUserBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(20),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminUserBody,
    });
  typia.assert(adminUser);

  // 3. Admin user logs in to confirm auth and token management
  const adminLoginBody = {
    email: adminUserBody.email,
    password_hash: adminUserBody.password_hash,
  } satisfies IEventRegistrationAdmin.ILogin;

  const adminUserLogin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminUserLogin);

  // 4. Create an event category via admin user
  const eventCategoryBody = {
    name: RandomGenerator.name(2),
    description: null,
  } satisfies IEventRegistrationEventCategory.ICreate;

  const eventCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      { body: eventCategoryBody },
    );
  typia.assert(eventCategory);

  // 5. Create an event under the created category via admin user
  const eventBody = {
    event_category_id: eventCategory.id,
    name: RandomGenerator.name(3),
    date: new Date(Date.now() + 86400_000).toISOString(), // +1 day
    location: RandomGenerator.paragraph({ sentences: 3 }),
    capacity: 100,
    description: null,
    ticket_price: 500,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;

  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: eventBody,
    });
  typia.assert(event);

  // 6. Register the regular user as attendee for the event
  const attendeeBody = {
    event_id: event.id,
    regular_user_id: regularUser.id,
  } satisfies IEventRegistrationEventAttendee.ICreate;

  const attendee: IEventRegistrationEventAttendee =
    await api.functional.eventRegistration.regularUser.regularUsers.attendees.createEventAttendeeForUser(
      connection,
      { regularUserId: regularUser.id, body: attendeeBody },
    );
  typia.assert(attendee);

  // 7. Validate that attendee record has correct user and event IDs
  TestValidator.equals(
    "attendee event id matches event created",
    attendee.event_id,
    event.id,
  );
  TestValidator.equals(
    "attendee regular user id matches regular user created",
    attendee.regular_user_id,
    regularUser.id,
  );

  // 8. Validate timestamps exist and are ISO date strings
  TestValidator.predicate(
    "attendee created_at is ISO date string",
    typeof attendee.created_at === "string" &&
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])[T ]([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
        attendee.created_at,
      ),
  );

  TestValidator.predicate(
    "attendee updated_at is ISO date string",
    typeof attendee.updated_at === "string" &&
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])[T ]([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
        attendee.updated_at,
      ),
  );
}
