import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCategory";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";
import type { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * This test verifies the entire scenario of successfully deleting an event
 * waitlist entry by an authorized event organizer user. The test performs:
 *
 * 1. Creating and authenticating an event organizer user.
 * 2. Creating and authenticating an admin user who creates a required event
 *    category and event.
 * 3. Creating a regular user who will be added to the event waitlist.
 * 4. The event organizer adds the regular user to the event waitlist.
 * 5. The event organizer deletes the waitlist entry by its unique ID.
 *
 * This comprehensive test verifies proper authorization, data flow,
 * resource creation, and cleanup workflows in line with business rules.
 */
export async function test_api_event_waitlist_erase_successful(
  connection: api.IConnection,
) {
  // 1. Create and authenticate event organizer user
  const eventOrganizerEmail = typia.random<string & tags.Format<"email">>();
  const eventOrganizerPassword = "password123";

  const eventOrganizer = await api.functional.auth.eventOrganizer.join(
    connection,
    {
      body: {
        email: eventOrganizerEmail,
        password_hash: eventOrganizerPassword,
        full_name: RandomGenerator.name(),
        email_verified: true,
      } satisfies IEventRegistrationEventOrganizer.ICreate,
    },
  );
  typia.assert(eventOrganizer);

  // 2. Create and authenticate admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "adminpass";

  const admin = await api.functional.auth.admin.join.createAdminUser(
    connection,
    {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        full_name: RandomGenerator.name(),
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // Admin login for subsequent admin operations
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 3. Admin creates event category
  const categoryBody = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IEventRegistrationEventCategory.ICreate;

  const eventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(eventCategory);

  // 4. Admin creates event
  const eventBody = {
    event_category_id: eventCategory.id,
    name: RandomGenerator.name(3),
    date: new Date(Date.now() + 86400000).toISOString(),
    location: RandomGenerator.name(3),
    capacity: 100,
    ticket_price: 20,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;

  const eventItem = await api.functional.eventRegistration.admin.events.create(
    connection,
    { body: eventBody },
  );
  typia.assert(eventItem);

  // 5. Create and authenticate regular user
  const regularUserEmail = typia.random<string & tags.Format<"email">>();
  const regularUserPassword = "userpass";

  const regularUser =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: {
        email: regularUserEmail,
        password_hash: regularUserPassword,
        full_name: RandomGenerator.name(),
        email_verified: true,
      } satisfies IEventRegistrationRegularUser.ICreate,
    });
  typia.assert(regularUser);

  // 6. Event organizer login for adding waitlist
  await api.functional.auth.eventOrganizer.login(connection, {
    body: {
      email: eventOrganizerEmail,
      password_hash: eventOrganizerPassword,
    } satisfies IEventRegistrationEventOrganizer.ILogin,
  });

  // Add regular user to event waitlist
  const waitlistCreateBody = {
    event_id: eventItem.id,
    regular_user_id: regularUser.id,
  } satisfies IEventRegistrationEventWaitlist.ICreate;

  const waitlistEntry =
    await api.functional.eventRegistration.eventOrganizer.events.waitlists.create(
      connection,
      {
        eventId: eventItem.id,
        body: waitlistCreateBody,
      },
    );
  typia.assert(waitlistEntry);

  // 7. Event organizer deletes the waitlist entry
  await api.functional.eventRegistration.eventOrganizer.eventWaitlists.erase(
    connection,
    {
      eventWaitlistId: waitlistEntry.id,
    },
  );
}
