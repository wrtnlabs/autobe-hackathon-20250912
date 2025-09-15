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
 * Validate that an admin user can successfully retrieve detailed event
 * attendee information.
 *
 * This test simulates a real-world workflow:
 *
 * 1. Create and authenticate an admin user.
 * 2. Create an event category.
 * 3. Create an event linked to the created category.
 * 4. Create and authenticate a regular user.
 * 5. Register the regular user as an attendee for the event.
 * 6. As the admin user, retrieve the event attendee detail by ID.
 * 7. Verify that the retrieved attendee's details match the created records.
 *
 * This ensures the admin can access attendee details, including IDs and
 * timestamps, validating correct API permission and data retrieval.
 */
export async function test_api_event_attendee_retrieve_detail_admin_success(
  connection: api.IConnection,
) {
  // 1. Admin user creation and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminUser: IEventRegistrationAdmin.IAuthorized =
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
  typia.assert(adminUser);

  // Authenticate as admin
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 2. Create event category for event creation
  const categoryName = RandomGenerator.name(2);
  const eventCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: {
          name: categoryName,
          description: null,
        } satisfies IEventRegistrationEventCategory.ICreate,
      },
    );
  typia.assert(eventCategory);

  // 3. Create event with created category
  const nowISOString = new Date().toISOString();
  const eventCapacity = typia.random<number & tags.Type<"int32">>();
  const eventTicketPrice = typia.random<number & tags.Minimum<0>>();
  const eventStatus = "scheduled" as const;

  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: {
        event_category_id: eventCategory.id,
        name: RandomGenerator.name(3),
        date: nowISOString,
        location: RandomGenerator.paragraph({ sentences: 3 }),
        capacity: eventCapacity,
        description: null,
        ticket_price: eventTicketPrice,
        status: eventStatus,
      } satisfies IEventRegistrationEvent.ICreate,
    });
  typia.assert(event);

  // 4. Create regular user and authenticate
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

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

  // 5. Register regular user as attendee to the event
  const attendee: IEventRegistrationEventAttendee =
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

  // 6. Authenticate as admin again (in case role switched)
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 7. Retrieve event attendee detail by ID
  const attendeeRetrieved: IEventRegistrationEventAttendee =
    await api.functional.eventRegistration.admin.events.attendees.at(
      connection,
      {
        eventId: event.id,
        eventAttendeeId: attendee.id,
      },
    );
  typia.assert(attendeeRetrieved);

  // 8. Validate returned attendee data
  TestValidator.equals(
    "event attendee ID should match",
    attendeeRetrieved.id,
    attendee.id,
  );
  TestValidator.equals(
    "event ID should match",
    attendeeRetrieved.event_id,
    event.id,
  );
  TestValidator.equals(
    "regular user ID should match",
    attendeeRetrieved.regular_user_id,
    regularUser.id,
  );
  TestValidator.predicate(
    "created_at should be valid ISO date",
    typeof attendeeRetrieved.created_at === "string" &&
      attendeeRetrieved.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be valid ISO date",
    typeof attendeeRetrieved.updated_at === "string" &&
      attendeeRetrieved.updated_at.length > 0,
  );
}
