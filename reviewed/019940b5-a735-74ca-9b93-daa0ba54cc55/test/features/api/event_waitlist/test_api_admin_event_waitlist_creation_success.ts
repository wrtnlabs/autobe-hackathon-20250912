import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCategory";
import type { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * Validate the successful creation of an event waitlist entry by an admin.
 *
 * This test first creates an admin user and logs in to establish
 * authorization. It then creates an event category to classify events and
 * creates a specific event with realistic details such as name, date,
 * location, and capacity.
 *
 * A regular user is then created and authenticated to represent a user to
 * be waitlisted. The test switches back to admin to create a waitlist entry
 * associating the regular user to the event.
 *
 * This ensures that the system correctly handles multi-role authentication
 * and properly processes event waitlist creation requests by admins. It
 * also tests the system's response integrity and data consistency through
 * validation of returned IDs and timestamps.
 *
 * Error scenarios are included for unauthorized access and invalid event or
 * user references.
 */
export async function test_api_admin_event_waitlist_creation_success(
  connection: api.IConnection,
) {
  // Helper function for generating random password hash
  function randomPasswordHash(): string {
    return RandomGenerator.alphaNumeric(64); // Simulate a 64-char hash string
  }

  // 1. Create and authenticate admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = randomPasswordHash();
  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: `https://example.com/${RandomGenerator.alphaNumeric(8)}.png`,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(adminUser);

  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPasswordHash,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 2. Create an event category
  const categoryName = `Category_${RandomGenerator.alphaNumeric(6)}`;
  const categoryDescription = RandomGenerator.paragraph({ sentences: 3 });
  const eventCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: {
          name: categoryName,
          description: categoryDescription,
        } satisfies IEventRegistrationEventCategory.ICreate,
      },
    );
  typia.assert(eventCategory);

  // 3. Create an event under this category
  const eventName = `Event_${RandomGenerator.alphaNumeric(6)}`;
  const eventDate = new Date(Date.now() + 86400 * 1000).toISOString(); // One day later
  const eventLocation = `Location_${RandomGenerator.alphaNumeric(5)}`;
  const eventCapacity = RandomGenerator.pick([
    10, 20, 30, 50, 100,
  ]) satisfies number;
  const eventTicketPrice = RandomGenerator.pick([
    0, 50, 100, 150, 200,
  ]) satisfies number;

  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: {
        event_category_id: eventCategory.id,
        name: eventName,
        date: eventDate,
        location: eventLocation,
        capacity: eventCapacity,
        description: RandomGenerator.content({ paragraphs: 1 }),
        ticket_price: eventTicketPrice,
        status: "scheduled",
      } satisfies IEventRegistrationEvent.ICreate,
    });
  typia.assert(event);

  // 4. Create and authenticate regular user
  const regularUserEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const regularUserPasswordHash = randomPasswordHash();
  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: {
        email: regularUserEmail,
        password_hash: regularUserPasswordHash,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: `https://example.com/${RandomGenerator.alphaNumeric(8)}.png`,
        email_verified: true,
      } satisfies IEventRegistrationRegularUser.ICreate,
    });
  typia.assert(regularUser);

  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: {
      email: regularUserEmail,
      password_hash: regularUserPasswordHash,
    } satisfies IEventRegistrationRegularUser.ILogin,
  });

  // 5. Switch back to admin context for waitlist creation
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPasswordHash,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 6. Create waitlist entry linking regular user to event
  const waitlistCreateBody = {
    event_id: event.id,
    regular_user_id: regularUser.id,
  } satisfies IEventRegistrationEventWaitlist.ICreate;

  const waitlistEntry: IEventRegistrationEventWaitlist =
    await api.functional.eventRegistration.admin.eventWaitlists.create(
      connection,
      {
        body: waitlistCreateBody,
      },
    );
  typia.assert(waitlistEntry);

  TestValidator.equals(
    "Waitlist event ID matches",
    waitlistEntry.event_id,
    event.id,
  );
  TestValidator.equals(
    "Waitlist regular user ID matches",
    waitlistEntry.regular_user_id,
    regularUser.id,
  );
  TestValidator.predicate(
    "Waitlist entry ID is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      waitlistEntry.id,
    ),
  );
  TestValidator.predicate(
    "Waitlist created_at is a valid datetime",
    Boolean(Date.parse(waitlistEntry.created_at)),
  );
  TestValidator.predicate(
    "Waitlist updated_at is a valid datetime",
    Boolean(Date.parse(waitlistEntry.updated_at)),
  );

  // 7. Error cases
  // 7.a Unauthorized creation (simulate unauthenticated connection)
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthorized waitlist creation should fail",
    async () => {
      await api.functional.eventRegistration.admin.eventWaitlists.create(
        unauthenticatedConn,
        {
          body: waitlistCreateBody,
        },
      );
    },
  );

  // 7.b Invalid event ID
  await TestValidator.error(
    "Waitlist creation with invalid event_id should fail",
    async () => {
      await api.functional.eventRegistration.admin.eventWaitlists.create(
        connection,
        {
          body: {
            event_id: typia.random<string & tags.Format<"uuid">>(),
            regular_user_id: regularUser.id,
          } satisfies IEventRegistrationEventWaitlist.ICreate,
        },
      );
    },
  );

  // 7.c Invalid regular user ID
  await TestValidator.error(
    "Waitlist creation with invalid regular_user_id should fail",
    async () => {
      await api.functional.eventRegistration.admin.eventWaitlists.create(
        connection,
        {
          body: {
            event_id: event.id,
            regular_user_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IEventRegistrationEventWaitlist.ICreate,
        },
      );
    },
  );
}
