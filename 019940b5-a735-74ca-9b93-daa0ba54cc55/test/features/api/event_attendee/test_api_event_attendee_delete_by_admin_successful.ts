import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * Administrator deletes an event attendee registration.
 *
 * This test covers the full lifecycle of event attendee management with admin
 * privileges. It performs the following steps:
 *
 * 1. Creates and authenticates an admin user.
 * 2. Creates an event as admin.
 * 3. Creates and authenticates a regular user.
 * 4. Registers the regular user as an attendee for the created event.
 * 5. Switches back to the admin user.
 * 6. Deletes the created event attendee registration as admin.
 *
 * This validates that admins can delete attendee registrations regardless of
 * ownership, supporting administrative event management functionality.
 *
 * All API responses are strictly validated using typia.assert().
 */
export async function test_api_event_attendee_delete_by_admin_successful(
  connection: api.IConnection,
) {
  // Create admin user
  const adminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;
  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreate,
    });
  typia.assert(admin);

  // Admin login
  const adminLogin = {
    email: admin.email,
    password_hash: adminCreate.password_hash,
  } satisfies IEventRegistrationAdmin.ILogin;
  const adminAuth: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: adminLogin,
    });
  typia.assert(adminAuth);

  // Create Event
  const eventCreate = {
    event_category_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    location: RandomGenerator.paragraph({ sentences: 3 }),
    capacity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    description: null,
    ticket_price: 0,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;
  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: eventCreate,
    });
  typia.assert(event);

  // Create regular user
  const regularCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationRegularUser.ICreate;
  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: regularCreate,
    });
  typia.assert(regularUser);

  // Regular user login
  const regularLogin = {
    email: regularUser.email,
    password_hash: regularCreate.password_hash,
  } satisfies IEventRegistrationRegularUser.ILogin;
  const regularAuth: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login.loginRegularUser(connection, {
      body: regularLogin,
    });
  typia.assert(regularAuth);

  // Register event attendee
  const attendeeCreate = {
    event_id: event.id,
    regular_user_id: regularUser.id,
  } satisfies IEventRegistrationEventAttendee.ICreate;
  const attendee: IEventRegistrationEventAttendee =
    await api.functional.eventRegistration.regularUser.eventAttendees.create(
      connection,
      {
        body: attendeeCreate,
      },
    );
  typia.assert(attendee);

  // Switch back to admin to delete attendee
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: adminLogin,
  });

  // Delete attendee by admin
  await api.functional.eventRegistration.admin.eventAttendees.erase(
    connection,
    {
      eventAttendeeId: attendee.id,
    },
  );
}
