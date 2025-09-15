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
 * This E2E test validates the successful update of an event attendee record by
 * an event organizer user with proper authentication and authorization roles.
 *
 * The test performs a full workflow involving multiple user roles and
 * resources:
 *
 * 1. Create and authenticate an event organizer user via
 *    /auth/eventOrganizer/join.
 * 2. Create and authenticate an admin user via /auth/admin/join.
 * 3. Using the admin user, create an event category via
 *    /eventRegistration/admin/eventCategories.
 * 4. Using admin user context, create an event associated with the category via
 *    /eventRegistration/admin/events.
 * 5. Create and authenticate a regular user via /auth/regularUser/join.
 * 6. Using the admin user context, register the regular user as an event attendee
 *    for the created event via
 *    /eventRegistration/admin/regularUsers/{regularUserId}/attendees. This
 *    provides the eventAttendeeId.
 * 7. Switch to the event organizer authentication context (via login).
 * 8. As the event organizer, update the attendee record with new data via PUT
 *    /eventRegistration/eventOrganizer/regularUsers/{regularUserId}/attendees/{eventAttendeeId}.
 * 9. Validate updated attendee record returned is as expected.
 *
 * This test ensures proper role-based access, authorization context switching,
 * and correctness of attendee update functionality.
 *
 * All required properties are provided with realistic random data respecting
 * format constraints such as UUIDs and ISO 8601 date-time strings. All API
 * responses are validated for data integrity with typia.assert(). TestValidator
 * is used to check equality of expected and actual ids.
 *
 * Authentication tokens are managed by SDK automatically, so no manual headers
 * management is performed. No unauthorized operations are attempted. The test
 * covers a realistic scenario for event management systems involving multiple
 * roles and resources.
 */
export async function test_api_event_attendee_update_by_event_organizer_success(
  connection: api.IConnection,
) {
  // 1) Create event organizer user and authenticate
  const organizerEmail = typia.random<string & tags.Format<"email">>();
  const eventOrganizer = await api.functional.auth.eventOrganizer.join(
    connection,
    {
      body: {
        email: organizerEmail,
        password_hash: "password123hashed",
        full_name: "Event Organizer",
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationEventOrganizer.ICreate,
    },
  );
  typia.assert(eventOrganizer);

  // 2) Create admin user and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join.createAdminUser(
    connection,
    {
      body: {
        email: adminEmail,
        password_hash: "adminpasshash",
        full_name: "Admin User",
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 3) Admin creates event category
  const categoryName = RandomGenerator.name(2);
  const eventCategory =
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

  // 4) Admin creates event
  const eventData = {
    event_category_id: eventCategory.id,
    name: "Annual Conference",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString(),
    location: "Convention Center",
    capacity: 500,
    description: null,
    ticket_price: 299,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;
  const event = await api.functional.eventRegistration.admin.events.create(
    connection,
    { body: eventData },
  );
  typia.assert(event);

  // 5) Create regular user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const regularUser =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: {
        email: userEmail,
        password_hash: "userpasshash",
        full_name: "Regular User",
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationRegularUser.ICreate,
    });
  typia.assert(regularUser);

  // 6) Admin registers regular user as event attendee
  const attendeeCreateData = {
    event_id: event.id,
    regular_user_id: regularUser.id,
  } satisfies IEventRegistrationEventAttendee.ICreate;
  const eventAttendee =
    await api.functional.eventRegistration.admin.regularUsers.attendees.createEventAttendeeForUser(
      connection,
      {
        regularUserId: regularUser.id,
        body: attendeeCreateData,
      },
    );
  typia.assert(eventAttendee);

  // 7) Login as event organizer to switch context
  const organizerLogin = await api.functional.auth.eventOrganizer.login(
    connection,
    {
      body: {
        email: eventOrganizer.email,
        password_hash: "password123hashed",
      } satisfies IEventRegistrationEventOrganizer.ILogin,
    },
  );
  typia.assert(organizerLogin);

  // 8) Update attendee record as event organizer
  const updateBody = {
    event_id: event.id,
    regular_user_id: regularUser.id,
    created_at: eventAttendee.created_at,
    updated_at: new Date().toISOString(),
  } satisfies IEventRegistrationEventAttendee.IUpdate;

  const updatedAttendee =
    await api.functional.eventRegistration.eventOrganizer.regularUsers.attendees.update(
      connection,
      {
        regularUserId: regularUser.id,
        eventAttendeeId: eventAttendee.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAttendee);

  // 9) Confirm the updated attendee id matches the original attendee id
  TestValidator.equals(
    "Check eventAttendee id equals after update",
    updatedAttendee.id,
    eventAttendee.id,
  );
}
