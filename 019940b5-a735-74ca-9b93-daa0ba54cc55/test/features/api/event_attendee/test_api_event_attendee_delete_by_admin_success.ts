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
 * Test successful deletion of event attendee record by an admin user.
 *
 * The test scenario simulates a multi-actor workflow involving an admin
 * user and a regular user within an event registration system.
 *
 * Step by step process:
 *
 * 1. Create an admin user account via the admin join API.
 * 2. Authenticate the admin user via the admin login API.
 * 3. Create an event category by the admin.
 * 4. Create an event under the event category by the admin.
 * 5. Create a regular user account via the regular user join API.
 * 6. Authenticate the regular user via the regular user login API.
 * 7. Using admin context, register the regular user as an attendee for the
 *    event.
 * 8. Using admin context, delete the event attendee record.
 * 9. Confirm the deletion operation completes successfully without errors.
 *
 * This test ensures admin users can manage event attendees correctly,
 * including creating necessary resources and performing deletions,
 * reflecting real-world multi-role system interactions.
 */
export async function test_api_event_attendee_delete_by_admin_success(
  connection: api.IConnection,
) {
  // 1. Create an admin user
  const adminEmail = `${RandomGenerator.name(1).replace(/ /g, "")}@example.com`;
  const adminPassword = "adminpassword";
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

  // 2. Authenticate admin user
  const adminLoginBody = {
    email: adminEmail,
    password_hash: adminPassword,
  } satisfies IEventRegistrationAdmin.ILogin;
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: adminLoginBody,
  });

  // 3. Create an event category by admin
  const eventCategoryCreateBody = {
    name: RandomGenerator.name(1),
    description: null,
  } satisfies IEventRegistrationEventCategory.ICreate;
  const eventCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: eventCategoryCreateBody,
      },
    );
  typia.assert(eventCategory);

  // 4. Create an event by admin under category
  const now = new Date();
  const eventCreateBody = {
    event_category_id: eventCategory.id,
    name: RandomGenerator.name(2),
    date: now.toISOString(),
    location: RandomGenerator.name(1),
    capacity: 100,
    description: null,
    ticket_price: 0,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;
  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: eventCreateBody,
    });
  typia.assert(event);

  // 5. Create a regular user
  const regularUserEmail = `${RandomGenerator.name(1).replace(/ /g, "")}@example.com`;
  const regularUserPassword = "userpassword";
  const regularUserCreateBody = {
    email: regularUserEmail,
    password_hash: regularUserPassword,
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

  // 6. Authenticate regular user
  const regularUserLoginBody = {
    email: regularUserEmail,
    password_hash: regularUserPassword,
  } satisfies IEventRegistrationRegularUser.ILogin;
  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: regularUserLoginBody,
  });

  // 7. Register the regular user as an event attendee by admin
  // Admin context assumed
  const eventAttendeeCreateBody = {
    event_id: event.id,
    regular_user_id: regularUser.id,
  } satisfies IEventRegistrationEventAttendee.ICreate;

  const eventAttendee: IEventRegistrationEventAttendee =
    await api.functional.eventRegistration.admin.regularUsers.attendees.createEventAttendeeForUser(
      connection,
      {
        regularUserId: regularUser.id,
        body: eventAttendeeCreateBody,
      },
    );
  typia.assert(eventAttendee);

  // 8. Delete the event attendee record by admin
  await api.functional.eventRegistration.admin.regularUsers.attendees.erase(
    connection,
    {
      regularUserId: regularUser.id,
      eventAttendeeId: eventAttendee.id,
    },
  );

  // 9. If no error thrown, deletion succeeded
  TestValidator.predicate(
    "event attendee deletion succeeded without errors",
    true,
  );
}
