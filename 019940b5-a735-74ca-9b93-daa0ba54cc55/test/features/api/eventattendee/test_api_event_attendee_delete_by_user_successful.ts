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
 * Test that a regular user can successfully delete their own event attendee
 * record.
 *
 * Workflow:
 *
 * 1. Create regular user account and authenticate as that user.
 * 2. Create admin user account, authenticate, and create a new event.
 * 3. Authenticate as the regular user again.
 * 4. Register the regular user as an attendee for the created event.
 * 5. Delete the attendee record as the regular user.
 * 6. Verify deletion was successful by absence of exceptions and no return value.
 */
export async function test_api_event_attendee_delete_by_user_successful(
  connection: api.IConnection,
) {
  // Step 1: Create a regular user and authenticate
  const regularUserCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: false,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const regularUser =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: regularUserCreateBody,
    });
  typia.assert(regularUser);

  // Step 2: Create an admin user and authenticate
  const adminCreateBody = {
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: false,
  } satisfies IEventRegistrationAdmin.ICreate;

  const adminUser = await api.functional.auth.admin.join.createAdminUser(
    connection,
    { body: adminCreateBody },
  );
  typia.assert(adminUser);

  // Step 3: Authenticate as admin user (login)
  const adminLoginBody = {
    email: adminCreateBody.email,
    password_hash: adminCreateBody.password_hash,
  } satisfies IEventRegistrationAdmin.ILogin;

  const adminLogin = await api.functional.auth.admin.login.loginAdminUser(
    connection,
    { body: adminLoginBody },
  );
  typia.assert(adminLogin);

  // Step 4: Create an event as the admin
  const eventCreateBody = {
    event_category_id: typia.random<string & tags.Format<"uuid">>(),
    name: `${RandomGenerator.name(2)} Event`,
    date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(), // One week ahead
    location: `Hall ${RandomGenerator.alphaNumeric(4)}`,
    capacity: 100,
    description: "This is a test event, created during E2E testing.",
    ticket_price: 0,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;

  const createdEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: eventCreateBody,
    });
  typia.assert(createdEvent);
  TestValidator.equals(
    "event creation validation",
    createdEvent.name,
    eventCreateBody.name,
  );

  // Step 5: Authenticate as the regular user (login)
  const regularUserLoginBody = {
    email: regularUserCreateBody.email,
    password_hash: regularUserCreateBody.password_hash,
  } satisfies IEventRegistrationRegularUser.ILogin;

  const regularUserLogin =
    await api.functional.auth.regularUser.login.loginRegularUser(connection, {
      body: regularUserLoginBody,
    });
  typia.assert(regularUserLogin);

  // Step 6: Register the regular user as an attendee for the created event
  const attendeeCreateBody = {
    event_id: createdEvent.id,
    regular_user_id: regularUser.id,
  } satisfies IEventRegistrationEventAttendee.ICreate;

  const createdAttendee =
    await api.functional.eventRegistration.regularUser.eventAttendees.create(
      connection,
      { body: attendeeCreateBody },
    );
  typia.assert(createdAttendee);

  // Step 7: Delete the attendee record as the regular user
  await api.functional.eventRegistration.regularUser.eventAttendees.erase(
    connection,
    { eventAttendeeId: createdAttendee.id },
  );
  // No return value expected - success is no error thrown
}
