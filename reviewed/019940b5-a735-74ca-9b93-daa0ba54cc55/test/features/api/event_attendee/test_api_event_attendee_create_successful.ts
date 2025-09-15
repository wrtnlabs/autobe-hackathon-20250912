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
 * Successful registration of a regular user as an attendee for a specific
 * event, covering:
 *
 * 1. Creating and authenticating a regular user with verified email
 * 2. Creating and authenticating an admin user with verified email
 * 3. Creating an event by admin with valid future date and capacity
 * 4. Switching to regular user context
 * 5. Registering the user as an event attendee linking user and event
 * 6. Validating the attendee record's correctness and property integrity
 *
 * This test simulates end-to-end workflow for event attendee registration
 * with proper multi-role user handling and API data validation.
 */
export async function test_api_event_attendee_create_successful(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a regular user with verified email
  const regularUserCreateBody = {
    email: `${RandomGenerator.name(1)}@example.com`,
    password_hash: "hashed_password_placeholder",
    full_name: RandomGenerator.name(),
    phone_number: undefined,
    profile_picture_url: undefined,
    email_verified: true,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: regularUserCreateBody,
    });
  typia.assert(regularUser);

  // Step 2: Create and authenticate an admin user with verified email
  const adminCreateBody = {
    email: `${RandomGenerator.name(1)}@example.com`,
    password_hash: "hashed_password_placeholder",
    full_name: RandomGenerator.name(),
    phone_number: undefined,
    profile_picture_url: undefined,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminUser);

  // Step 3: Authenticate as admin user to create the event
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminCreateBody.email,
      password_hash: adminCreateBody.password_hash,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // Step 4: Create a new event with future date and realistic details
  const futureDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const eventCreateBody = {
    event_category_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(3),
    date: futureDate,
    location: RandomGenerator.name(2),
    capacity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
    description: null,
    ticket_price: 0,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;

  const createdEvent: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: eventCreateBody,
    });
  typia.assert(createdEvent);

  // Step 5: Switch to regular user context for attendee registration
  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: {
      email: regularUserCreateBody.email,
      password_hash: regularUserCreateBody.password_hash,
    } satisfies IEventRegistrationRegularUser.ILogin,
  });

  // Step 6: Register the regular user as an event attendee
  const attendeeCreateBody = {
    event_id: createdEvent.id,
    regular_user_id: regularUser.id,
  } satisfies IEventRegistrationEventAttendee.ICreate;

  const attendee: IEventRegistrationEventAttendee =
    await api.functional.eventRegistration.regularUser.eventAttendees.create(
      connection,
      { body: attendeeCreateBody },
    );
  typia.assert(attendee);

  // Step 7: Validate correct linking of attendee to user and event
  TestValidator.equals(
    "attendee event id matches",
    attendee.event_id,
    createdEvent.id,
  );
  TestValidator.equals(
    "attendee user id matches",
    attendee.regular_user_id,
    regularUser.id,
  );
}
