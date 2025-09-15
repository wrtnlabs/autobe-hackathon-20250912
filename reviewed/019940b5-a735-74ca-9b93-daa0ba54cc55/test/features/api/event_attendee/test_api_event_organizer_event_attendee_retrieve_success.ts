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
 * This test validates an event organizer's ability to retrieve a specific event
 * attendee's details.
 *
 * The process includes:
 *
 * 1. Admin user creation and login for event category creation.
 * 2. Creation of a new event category by admin.
 * 3. Event organizer user creation and login.
 * 4. Creation of an event by the event organizer under the created category.
 * 5. Registration of a regular user.
 * 6. Attendee creation by linking user and event.
 * 7. The event organizer retrieving the created attendee by attendee ID.
 *
 * The test asserts proper role-based authentication context switching, correct
 * creation of dependent resources, and validates that the retrieved attendee's
 * data matches the created record.
 */
export async function test_api_event_organizer_event_attendee_retrieve_success(
  connection: api.IConnection,
) {
  // 1. Admin user creation and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminCreateBody = {
    email: adminEmail,
    password_hash: adminPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // Admin login to ensure proper authorization context
  const adminLoginBody = {
    email: adminEmail,
    password_hash: adminPassword,
  } satisfies IEventRegistrationAdmin.ILogin;

  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: adminLoginBody,
  });

  // 2. Admin creates event category
  const eventCategoryCreateBody = {
    name: `category-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IEventRegistrationEventCategory.ICreate;

  const eventCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: eventCategoryCreateBody,
      },
    );
  typia.assert(eventCategory);

  // 3. Event organizer user creation and login
  const organizerEmail = typia.random<string & tags.Format<"email">>();
  const organizerPassword = RandomGenerator.alphaNumeric(12);
  const organizerCreateBody = {
    email: organizerEmail,
    password_hash: organizerPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationEventOrganizer.ICreate;

  const organizer: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: organizerCreateBody,
    });
  typia.assert(organizer);

  // Event organizer login
  const organizerLoginBody = {
    email: organizerEmail,
    password_hash: organizerPassword,
  } satisfies IEventRegistrationEventOrganizer.ILogin;

  await api.functional.auth.eventOrganizer.login(connection, {
    body: organizerLoginBody,
  });

  // 4. Event creation by event organizer
  const eventCreateBody = {
    event_category_id: eventCategory.id,
    name: `event-${RandomGenerator.alphaNumeric(8)}`,
    date: new Date(Date.now() + 1000 * 3600 * 24).toISOString(), // Tomorrow
    location: RandomGenerator.paragraph({ sentences: 3 }),
    capacity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
    description: RandomGenerator.paragraph({ sentences: 8 }),
    ticket_price: Math.floor(Math.random() * 100) + 20, // Random between 20-119
    status: "scheduled" as const,
  } satisfies IEventRegistrationEvent.ICreate;

  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.eventOrganizer.events.create(
      connection,
      {
        body: eventCreateBody,
      },
    );
  typia.assert(event);

  // 5. Regular user creation and login
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userCreateBody = {
    email: userEmail,
    password_hash: userPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: userCreateBody,
    });
  typia.assert(regularUser);

  // Regular user login
  const userLoginBody = {
    email: userEmail,
    password_hash: userPassword,
  } satisfies IEventRegistrationRegularUser.ILogin;

  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: userLoginBody,
  });

  // 6. Regular user registers as event attendee
  const attendeeCreateBody = {
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

  // 7. Switch back to event organizer for retrieval
  await api.functional.auth.eventOrganizer.login(connection, {
    body: organizerLoginBody,
  });

  // Retrieve the specific attendee by eventAttendeeId
  const retrievedAttendee: IEventRegistrationEventAttendee =
    await api.functional.eventRegistration.eventOrganizer.eventAttendees.at(
      connection,
      {
        eventAttendeeId: attendee.id,
      },
    );
  typia.assert(retrievedAttendee);

  // Assertions to verify attendee data correctness
  TestValidator.equals(
    "attendee id matches",
    retrievedAttendee.id,
    attendee.id,
  );
  TestValidator.equals("event ids match", retrievedAttendee.event_id, event.id);
  TestValidator.equals(
    "user ids match",
    retrievedAttendee.regular_user_id,
    regularUser.id,
  );
  TestValidator.predicate(
    "created_at is valid ISO string",
    typeof retrievedAttendee.created_at === "string" &&
      !isNaN(Date.parse(retrievedAttendee.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO string",
    typeof retrievedAttendee.updated_at === "string" &&
      !isNaN(Date.parse(retrievedAttendee.updated_at)),
  );
}
