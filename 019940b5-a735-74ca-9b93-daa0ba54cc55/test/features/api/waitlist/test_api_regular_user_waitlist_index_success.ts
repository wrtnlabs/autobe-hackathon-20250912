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

export async function test_api_regular_user_waitlist_index_success(
  connection: api.IConnection,
) {
  // 1. Regular user joins (registers)
  const regularUserJoinBody = {
    email: `user${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: regularUserJoinBody,
    });
  typia.assert(regularUser);

  // 2. Admin user joins and logs in
  const adminJoinBody = {
    email: `admin${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminUser);

  // Log in admin user to get fresh token
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminJoinBody.email,
      password_hash: adminJoinBody.password_hash,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 3. Admin creates an event category
  const categoryName = RandomGenerator.name(1);
  const eventCategoryCreateBody = {
    name: categoryName,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IEventRegistrationEventCategory.ICreate;

  const eventCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      { body: eventCategoryCreateBody },
    );
  typia.assert(eventCategory);

  // 4. Event organizer user joins and logs in
  const organizerJoinBody = {
    email: `organizer${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationEventOrganizer.ICreate;

  const eventOrganizerUser: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: organizerJoinBody,
    });
  typia.assert(eventOrganizerUser);

  // Login event organizer user
  await api.functional.auth.eventOrganizer.login(connection, {
    body: {
      email: organizerJoinBody.email,
      password_hash: organizerJoinBody.password_hash,
    } satisfies IEventRegistrationEventOrganizer.ILogin,
  });

  // 5. Event organizer creates an event with the created category
  const now = new Date();
  const eventDate = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    15,
    10,
    0,
    0,
  ).toISOString();

  const eventCreateBody = {
    event_category_id: eventCategory.id,
    name: `Event ${RandomGenerator.paragraph({ sentences: 2 })}`,
    date: eventDate,
    location: `Location ${RandomGenerator.paragraph({ sentences: 1 })}`,
    capacity: 100,
    description: RandomGenerator.content({ paragraphs: 2 }),
    ticket_price: 150,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;

  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.eventOrganizer.events.create(
      connection,
      { body: eventCreateBody },
    );
  typia.assert(event);

  // 6. Switch back to regular user login to get fresh token
  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: {
      email: regularUserJoinBody.email,
      password_hash: regularUserJoinBody.password_hash,
    } satisfies IEventRegistrationRegularUser.ILogin,
  });

  // 7. Add regular user to waitlist of the created event
  const waitlistCreateBody = {
    event_id: event.id,
    regular_user_id: regularUser.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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

  // 8. Retrieve paginated waitlist entries filtered by regular user ID
  const waitlistQueryBody = {
    page: 1,
    limit: 10,
    regular_user_id: regularUser.id,
  } satisfies IEventRegistrationEventWaitlist.IRequest;

  const waitlistPage: IPageIEventRegistrationEventWaitlist.ISummary =
    await api.functional.eventRegistration.regularUser.regularUsers.waitlists.index(
      connection,
      {
        regularUserId: regularUser.id,
        body: waitlistQueryBody,
      },
    );
  typia.assert(waitlistPage);

  // 9. Validate all waitlist entries belong to the correct regular user
  for (const entry of waitlistPage.data) {
    TestValidator.equals(
      "regular user ID matches",
      entry.regular_user_id,
      regularUser.id,
    );
  }

  // 10. Validate pagination properties
  TestValidator.predicate(
    "pagination current page 1",
    waitlistPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit 10",
    waitlistPage.pagination.limit === 10,
  );

  // 11. Validate that events referenced in the waitlist entries exist and match
  const eventIdSet: Set<string> = new Set();
  for (const entry of waitlistPage.data) eventIdSet.add(entry.event_id);
  TestValidator.predicate(
    "at least one event in waitlist",
    eventIdSet.size > 0,
  );

  TestValidator.equals("only one event ID is referenced", eventIdSet.size, 1);
  TestValidator.equals(
    "event ID matches created event",
    Array.from(eventIdSet)[0],
    event.id,
  );
}
