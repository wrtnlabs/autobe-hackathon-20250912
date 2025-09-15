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
 * Test successful update of event attendee record by an admin user with valid
 * data and proper authorization.
 *
 * The scenario includes creating an admin user, event category, and event, then
 * creating a regular user who is registered as an event attendee. Finally, the
 * attendee record is updated and validated.
 *
 * This comprehensive test flows through multi-role authentication and data
 * consistency checks.
 */
export async function test_api_event_attendee_update_by_admin_success(
  connection: api.IConnection,
) {
  // 1. Create admin user
  const adminCreateBody = {
    email: `${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}@admin.com`,
    password_hash: "hashedpassword",
    full_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Admin creates event category
  const categoryCreateBody = {
    name: RandomGenerator.name(1).replace(/\s/g, ""),
    description: "Test event category",
  } satisfies IEventRegistrationEventCategory.ICreate;

  const category: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 3. Admin creates event
  const eventCreateBody = {
    event_category_id: category.id,
    name: RandomGenerator.name(2),
    date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    location: "Test Location",
    capacity: 100,
    description: "An event for testing",
    ticket_price: 5000,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;

  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: eventCreateBody,
    });
  typia.assert(event);

  // 4. Create regular user
  const regularUserCreateBody = {
    email: `${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}@user.com`,
    password_hash: "hasheduserpassword",
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

  // 5. Admin registers regular user as event attendee
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

  // 6. Admin updates event attendee record
  const updatedEventId = event.id;

  const attendeeUpdateBody = {
    event_id: updatedEventId,
    regular_user_id: regularUser.id,
    created_at: attendee.created_at,
    updated_at: new Date().toISOString(),
  } satisfies IEventRegistrationEventAttendee.IUpdate;

  const updatedAttendee: IEventRegistrationEventAttendee =
    await api.functional.eventRegistration.admin.regularUsers.attendees.update(
      connection,
      {
        regularUserId: regularUser.id,
        eventAttendeeId: attendee.id,
        body: attendeeUpdateBody,
      },
    );
  typia.assert(updatedAttendee);

  // 7. Validate update
  TestValidator.equals(
    "Updated attendee ID matches original",
    updatedAttendee.id,
    attendee.id,
  );
  TestValidator.equals(
    "Updated attendee event_id matches expected",
    updatedAttendee.event_id,
    updatedEventId,
  );
  TestValidator.equals(
    "Updated attendee regular_user_id matches expected",
    updatedAttendee.regular_user_id,
    regularUser.id,
  );
  TestValidator.predicate(
    "Updated attendee updated_at is recent",
    new Date(updatedAttendee.updated_at).getTime() >=
      new Date(attendee.created_at).getTime(),
  );
}
