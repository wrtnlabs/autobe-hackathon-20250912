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
 * Test scenario to validate successful creation of an event waitlist entry.
 *
 * The test performs the following steps:
 *
 * 1. Admin user creation and login to create an event category.
 * 2. Event organizer user creation and login to create an event in the created
 *    category.
 * 3. Regular user creation and login for waitlisting.
 * 4. Event organizer adds the regular user to the event waitlist.
 *
 * Each step uses proper authenticated context, and assertions verify the data
 * correctness.
 */
export async function test_api_event_waitlist_create_success(
  connection: api.IConnection,
) {
  // 1. Admin user creation
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
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

  // 2. Admin user login (to establish admin auth context)
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 3. Create event category by admin
  const categoryCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 9 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IEventRegistrationEventCategory.ICreate;
  const category: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 4. Event organizer user creation
  const organizerEmail: string = typia.random<string & tags.Format<"email">>();
  const organizerPassword = RandomGenerator.alphaNumeric(12);
  const organizerCreateBody = {
    email: organizerEmail,
    password_hash: organizerPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationEventOrganizer.ICreate;

  const organizer: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: organizerCreateBody,
    });
  typia.assert(organizer);

  // 5. Event organizer login
  await api.functional.auth.eventOrganizer.login(connection, {
    body: {
      email: organizerEmail,
      password_hash: organizerPassword,
    } satisfies IEventRegistrationEventOrganizer.ILogin,
  });

  // 6. Create an event under the created category
  // Date: future date (1 month ahead)
  const eventDate = new Date();
  eventDate.setMonth(eventDate.getMonth() + 1);

  const eventCreateBody = {
    event_category_id: category.id,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 8 }),
    date: eventDate.toISOString(),
    location: RandomGenerator.name(3),
    capacity: 100,
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 5,
      wordMax: 14,
    }),
    ticket_price: 50,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;

  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.eventOrganizer.events.create(
      connection,
      {
        body: eventCreateBody,
      },
    );
  typia.assert(event);

  // 7. Regular user creation
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userCreateBody = {
    email: userEmail,
    password_hash: userPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const user: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: userCreateBody,
    });
  typia.assert(user);

  // 8. Regular user login
  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: {
      email: userEmail,
      password_hash: userPassword,
    } satisfies IEventRegistrationRegularUser.ILogin,
  });

  // 9. Switch back to event organizer for waitlist creation
  await api.functional.auth.eventOrganizer.login(connection, {
    body: {
      email: organizerEmail,
      password_hash: organizerPassword,
    } satisfies IEventRegistrationEventOrganizer.ILogin,
  });

  // 10. Create event waitlist entry for the regular user
  const waitlistCreateBody = {
    event_id: event.id,
    regular_user_id: user.id,
  } satisfies IEventRegistrationEventWaitlist.ICreate;

  const waitlistEntry: IEventRegistrationEventWaitlist =
    await api.functional.eventRegistration.eventOrganizer.events.waitlists.create(
      connection,
      {
        eventId: event.id,
        body: waitlistCreateBody,
      },
    );
  typia.assert(waitlistEntry);

  // Validate waitlist entry linkage
  TestValidator.equals(
    "waitlist event_id matches event",
    waitlistEntry.event_id,
    event.id,
  );

  TestValidator.equals(
    "waitlist regular_user_id matches user",
    waitlistEntry.regular_user_id,
    user.id,
  );
}
