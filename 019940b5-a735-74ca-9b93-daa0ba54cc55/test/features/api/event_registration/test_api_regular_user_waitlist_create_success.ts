import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventWaitlists } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlists";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * Validate successful creation of a waitlist entry for a regular user.
 *
 * This test covers the full workflow: admin user creation and login, event
 * creation, regular user creation and login, and waitlist entry creation
 * linking the user to the event. Each step checks the response structure
 * and business data correctness.
 *
 * Steps:
 *
 * 1. Admin joins and logs in to obtain authorization.
 * 2. Admin creates a valid event with required fields.
 * 3. Regular user joins and logs in to obtain authorization.
 * 4. Regular user creates a waitlist entry for the event.
 * 5. Validate all responses with typia.assert and validate data correctness.
 *
 * This ensures that the waitlist creation API works as intended in a
 * realistic multi-role interaction scenario.
 */
export async function test_api_regular_user_waitlist_create_success(
  connection: api.IConnection,
) {
  // 1. Admin user creation and login
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

  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 2. Admin creates an event
  const eventCategoryId = typia.random<string & tags.Format<"uuid">>();
  const eventCreateBody = {
    event_category_id: eventCategoryId,
    name: RandomGenerator.name(3),
    date: new Date(Date.now() + 86400000).toISOString(), // One day in future
    location: RandomGenerator.name(2),
    capacity: 50,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    ticket_price: 100,
    status: "scheduled" as const,
  } satisfies IEventRegistrationEvent.ICreate;

  const createdEvent: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: eventCreateBody,
    });
  typia.assert(createdEvent);
  TestValidator.equals(
    "event name matches creation input",
    createdEvent.name,
    eventCreateBody.name,
  );

  // 3. Regular user creation and login
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

  // 4. Regular user creates a waitlist entry for the event
  const waitlistCreateBody = {
    event_id: createdEvent.id,
    regular_user_id: regularUser.id,
  } satisfies IEventRegistrationEventWaitlists.ICreate;

  const waitlistEntry: IEventRegistrationEventWaitlists =
    await api.functional.eventRegistration.regularUser.regularUsers.waitlists.createWaitlistEntry(
      connection,
      {
        regularUserId: regularUser.id,
        body: waitlistCreateBody,
      },
    );
  typia.assert(waitlistEntry);

  // Validate waitlist entry associations
  TestValidator.equals(
    "waitlist entry event ID matches",
    waitlistEntry.event_id,
    createdEvent.id,
  );
  TestValidator.equals(
    "waitlist entry user ID matches",
    waitlistEntry.regular_user_id,
    regularUser.id,
  );
  TestValidator.predicate(
    "waitlist entry has created_at timestamp",
    typeof waitlistEntry.created_at === "string" &&
      waitlistEntry.created_at.length > 0,
  );
  TestValidator.predicate(
    "waitlist entry has updated_at timestamp",
    typeof waitlistEntry.updated_at === "string" &&
      waitlistEntry.updated_at.length > 0,
  );
}
