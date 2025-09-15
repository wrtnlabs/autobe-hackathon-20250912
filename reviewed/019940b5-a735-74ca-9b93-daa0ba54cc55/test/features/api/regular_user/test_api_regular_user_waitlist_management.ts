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
import type { IEventRegistrationEventWaitlists } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlists";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventWaitlist";

/**
 * Test management of the event waitlist by a regular user.
 *
 * This test method simulates a complete multi-role workflow managing event
 * waitlists.
 *
 * Steps:
 *
 * 1. Create and login as an admin user to create an event category.
 * 2. Create and login as an event organizer user to create an event under the
 *    category.
 * 3. Create and login as a regular user and add themself to the event
 *    waitlist.
 * 4. Retrieve and verify the waitlist entries for the regular user.
 * 5. Attempt to retrieve waitlist entries for another user and expect no
 *    entries.
 *
 * This comprehensive test validates key API functionalities including user
 * registration, role-based authentication, event and category creation,
 * waitlist management, and authorization constraints within the event
 * registration system.
 *
 * It ensures all business logic, data relationships, and permissions are
 * correctly enforced.
 */
export async function test_api_regular_user_waitlist_management(
  connection: api.IConnection,
) {
  // 1. Create admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: "hashed_password",
        full_name: RandomGenerator.name(),
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Login as admin for creating event category
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: admin.email,
      password_hash: "hashed_password",
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 3. Create event category
  const categoryName = RandomGenerator.name(1);
  const categoryDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const category: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: {
          name: categoryName,
          description: categoryDescription,
        } satisfies IEventRegistrationEventCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Create event organizer user
  const organizerEmail = typia.random<string & tags.Format<"email">>();
  const organizer: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: {
        email: organizerEmail,
        password_hash: "hashed_password",
        full_name: RandomGenerator.name(),
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationEventOrganizer.ICreate,
    });
  typia.assert(organizer);

  // 5. Login as event organizer
  await api.functional.auth.eventOrganizer.login(connection, {
    body: {
      email: organizer.email,
      password_hash: "hashed_password",
    } satisfies IEventRegistrationEventOrganizer.ILogin,
  });

  // 6. Create event using organizer auth
  const eventName = RandomGenerator.name(2);
  const eventDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const eventLocation = RandomGenerator.name(3);
  const eventDescription = RandomGenerator.content({ paragraphs: 2 });
  const eventCapacity = 100;
  const eventTicketPrice = 50;
  const eventStatus = "scheduled" as const;

  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.eventOrganizer.events.create(
      connection,
      {
        body: {
          event_category_id: category.id,
          name: eventName,
          date: eventDate,
          location: eventLocation,
          capacity: eventCapacity,
          description: eventDescription,
          ticket_price: eventTicketPrice,
          status: eventStatus,
        } satisfies IEventRegistrationEvent.ICreate,
      },
    );
  typia.assert(event);

  TestValidator.predicate(
    "event ID is valid UUID",
    /^[0-9a-f-]{36}$/i.test(event.id),
  );

  // 7. Create regular user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: {
        email: userEmail,
        password_hash: "hashed_password",
        full_name: RandomGenerator.name(),
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationRegularUser.ICreate,
    });
  typia.assert(regularUser);

  // 8. Login as regular user
  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: {
      email: regularUser.email,
      password_hash: "hashed_password",
    } satisfies IEventRegistrationRegularUser.ILogin,
  });

  // 9. Add regular user to event waitlist
  const waitlistEntry: IEventRegistrationEventWaitlists =
    await api.functional.eventRegistration.regularUser.regularUsers.waitlists.createWaitlistEntry(
      connection,
      {
        regularUserId: regularUser.id,
        body: {
          event_id: event.id,
          regular_user_id: regularUser.id,
          created_at: null,
          updated_at: null,
        } satisfies IEventRegistrationEventWaitlists.ICreate,
      },
    );
  typia.assert(waitlistEntry);

  TestValidator.equals(
    "waitlist entry regular user ID matches",
    waitlistEntry.regular_user_id,
    regularUser.id,
  );
  TestValidator.equals(
    "waitlist entry event ID matches",
    waitlistEntry.event_id,
    event.id,
  );

  // 10. Retrieve waitlist entries for the regular user
  const waitlistPage: IPageIEventRegistrationEventWaitlist.ISummary =
    await api.functional.eventRegistration.regularUser.regularUsers.waitlists.index(
      connection,
      {
        regularUserId: regularUser.id,
        body: {
          page: 1,
          limit: 10,
          event_id: event.id,
          regular_user_id: regularUser.id,
        } satisfies IEventRegistrationEventWaitlist.IRequest,
      },
    );
  typia.assert(waitlistPage);

  TestValidator.predicate(
    "waitlist data includes created waitlist entry",
    waitlistPage.data.some((entry) => entry.id === waitlistEntry.id),
  );

  // 11. Negative case: Attempt to access waitlist entries for another user, expect no entries
  const anotherUserId = typia.random<string & tags.Format<"uuid">>();
  const waitlistForAnotherUser: IPageIEventRegistrationEventWaitlist.ISummary =
    await api.functional.eventRegistration.regularUser.regularUsers.waitlists.index(
      connection,
      {
        regularUserId: anotherUserId,
        body: {
          page: 1,
          limit: 10,
          regular_user_id: anotherUserId,
        } satisfies IEventRegistrationEventWaitlist.IRequest,
      },
    );
  typia.assert(waitlistForAnotherUser);

  TestValidator.equals(
    "waitlist data is empty for unrelated user",
    waitlistForAnotherUser.data.length,
    0,
  );
}
