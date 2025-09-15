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
 * Test the successful deletion of an event attendee record by the owning
 * regular user.
 *
 * This comprehensive test covers the entire workflow:
 *
 * 1. Creation and authentication of a regular user account.
 * 2. Creation and authentication of an admin user account.
 * 3. Admin creates an event category.
 * 4. Admin creates an event under this category.
 * 5. The regular user logs in and registers as an attendee.
 * 6. The regular user deletes their attendee registration.
 *
 * Each step validates API responses and maintains authentication contexts
 * properly. Business rules such as event capacity and user verification are
 * implicitly respected. The final deletion confirms user ownership and
 * authorization.
 */
export async function test_api_event_attendee_delete_by_regular_user_success(
  connection: api.IConnection,
) {
  // 1. Create regular user account
  const regularUserEmail = `${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}@example.com`;
  const regularUserPassword = "securePassword123!";
  const regularUserCreateBody = {
    email: regularUserEmail,
    password_hash: regularUserPassword,
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationRegularUser.ICreate;
  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: regularUserCreateBody,
    });
  typia.assert(regularUser);

  // 2. Create admin user account
  const adminEmail = `${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}@admin.com`;
  const adminPassword = "adminSecure123!";
  const adminCreateBody = {
    email: adminEmail,
    password_hash: adminPassword,
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;
  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminUser);

  // 3. Login as admin user to authenticate context for event category and event creation
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 4. Create event category
  const eventCategoryCreateBody = {
    name: RandomGenerator.name(1).replace(/\s/g, "") + "Category",
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

  // 5. Create event under the created category
  const now = new Date();
  const eventCreateBody = {
    event_category_id: eventCategory.id,
    name: RandomGenerator.name(2),
    date: new Date(now.getTime() + 86400000).toISOString(), // One day from now
    location: "Test venue",
    capacity: 100,
    description: "Test event description",
    ticket_price: 50,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;
  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: eventCreateBody,
    });
  typia.assert(event);

  // 6. Switch authentication back to the regular user
  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: {
      email: regularUserEmail,
      password_hash: regularUserPassword,
    } satisfies IEventRegistrationRegularUser.ILogin,
  });

  // 7. Register the regular user as an attendee for the event
  const eventAttendeeCreateBody = {
    event_id: event.id,
    regular_user_id: regularUser.id,
  } satisfies IEventRegistrationEventAttendee.ICreate;
  const attendee: IEventRegistrationEventAttendee =
    await api.functional.eventRegistration.regularUser.eventAttendees.create(
      connection,
      {
        body: eventAttendeeCreateBody,
      },
    );
  typia.assert(attendee);

  // 8. Delete the attendee record by the owning regular user
  await api.functional.eventRegistration.regularUser.regularUsers.attendees.erase(
    connection,
    {
      regularUserId: regularUser.id,
      eventAttendeeId: attendee.id,
    },
  );
}
