import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import type { IEventRegistrationEventWaitlists } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlists";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * Validates retrieval of a specific waitlist entry detail for a regular
 * user.
 *
 * Business Context: This test ensures the entire workflow of creating a
 * regular user, an admin user, creating an event, adding the regular user
 * to the event's waitlist, and then retrieving the waitlist details. It
 * checks the integrity and correctness of the waitlist retrieval API
 * endpoint, validating path parameters and response data.
 *
 * Workflow:
 *
 * 1. Create and authenticate a regular user with unique email and secure
 *    password hash.
 * 2. Create and authenticate an admin user with unique email and secure
 *    password hash.
 * 3. Admin creates an event with appropriate realistic data including valid
 *    event category ID.
 * 4. Regular user authenticates.
 * 5. Regular user creates a waitlist entry for the event.
 * 6. Retrieve the waitlist entry detail by regular user ID and waitlist entry
 *    ID.
 * 7. Validate the retrieved waitlist data matches the one created, including
 *    correct UUIDs and ISO 8601 timestamps.
 */
export async function test_api_regular_user_waitlist_at_success(
  connection: api.IConnection,
) {
  // Step 1: Regular user joins and is authorized with unique email
  const regularUserCreated =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: {
        email: `user_${typia.random<string & tags.Format<"uuid">>()}@example.com`,
        password_hash: "hashed_password",
        full_name: RandomGenerator.name(),
        phone_number: null,
        profile_picture_url: null,
        email_verified: false,
      } satisfies IEventRegistrationRegularUser.ICreate,
    });
  typia.assert(regularUserCreated);

  // Step 2: Admin user joins and is authorized with unique email
  const adminUserCreated = await api.functional.auth.admin.join.createAdminUser(
    connection,
    {
      body: {
        email: `admin_${typia.random<string & tags.Format<"uuid">>()}@example.com`,
        password_hash: "hashed_password",
        full_name: RandomGenerator.name(),
        phone_number: null,
        profile_picture_url: null,
        email_verified: false,
      } satisfies IEventRegistrationAdmin.ICreate,
    },
  );
  typia.assert(adminUserCreated);

  // Step 3: Admin logs in to establish session
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminUserCreated.email,
      password_hash: "hashed_password",
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // Step 4: Admin creates an event with realistic data
  const eventCreated =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: {
        event_category_id: typia.random<string & tags.Format<"uuid">>(), // Assuming a valid category ID
        name: RandomGenerator.name(3),
        date: new Date(Date.now() + 86400000).toISOString(),
        location: "Test Location",
        capacity: 100,
        description: "This is a test event.",
        ticket_price: 5000,
        status: "scheduled",
      } satisfies IEventRegistrationEvent.ICreate,
    });
  typia.assert(eventCreated);

  // Step 5: Regular user logs in to establish session
  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: {
      email: regularUserCreated.email,
      password_hash: "hashed_password",
    } satisfies IEventRegistrationRegularUser.ILogin,
  });

  // Step 6: Regular user creates a waitlist entry for the event
  const waitlistCreated =
    await api.functional.eventRegistration.regularUser.regularUsers.waitlists.createWaitlistEntry(
      connection,
      {
        regularUserId: regularUserCreated.id,
        body: {
          event_id: eventCreated.id,
          regular_user_id: regularUserCreated.id,
          created_at: null,
          updated_at: null,
        } satisfies IEventRegistrationEventWaitlists.ICreate,
      },
    );
  typia.assert(waitlistCreated);

  // Step 7: Retrieve the waitlist entry detail by waitlist ID and regular user ID
  const waitlistDetail =
    await api.functional.eventRegistration.regularUser.regularUsers.waitlists.at(
      connection,
      {
        regularUserId: regularUserCreated.id,
        eventWaitlistId: waitlistCreated.id,
      },
    );
  typia.assert(waitlistDetail);

  // Step 8: Validate the waitlist details match created data
  TestValidator.equals(
    "Waitlist entry ID matches",
    waitlistDetail.id,
    waitlistCreated.id,
  );
  TestValidator.equals(
    "Waitlist entry event ID matches",
    waitlistDetail.event_id,
    eventCreated.id,
  );
  TestValidator.equals(
    "Waitlist entry regular user ID matches",
    waitlistDetail.regular_user_id,
    regularUserCreated.id,
  );
  TestValidator.predicate(
    "Waitlist created_at is ISO 8601 format",
    typeof waitlistDetail.created_at === "string" &&
      !!waitlistDetail.created_at.match(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/,
      ),
  );
  TestValidator.predicate(
    "Waitlist updated_at is ISO 8601 format",
    typeof waitlistDetail.updated_at === "string" &&
      !!waitlistDetail.updated_at.match(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/,
      ),
  );
}
