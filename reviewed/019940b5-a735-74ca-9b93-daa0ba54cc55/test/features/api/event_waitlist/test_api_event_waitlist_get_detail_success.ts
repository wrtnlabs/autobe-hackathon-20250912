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

export async function test_api_event_waitlist_get_detail_success(
  connection: api.IConnection,
) {
  // Step 1: Admin user creation
  const adminCreateBody = {
    email: RandomGenerator.pick([
      "admin1@example.com",
      "admin2@example.com",
    ] as const),
    password_hash: RandomGenerator.alphaNumeric(64),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;
  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminUser);

  // Step 2: Admin login
  const adminLoginBody = {
    email: adminCreateBody.email,
    password_hash: adminCreateBody.password_hash,
  } satisfies IEventRegistrationAdmin.ILogin;
  const adminLoggedIn: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // Step 3: Event organizer creation
  const eventOrgCreateBody = {
    email: RandomGenerator.pick([
      "org1@example.com",
      "org2@example.com",
    ] as const),
    password_hash: RandomGenerator.alphaNumeric(64),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationEventOrganizer.ICreate;
  const eventOrganizer: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: eventOrgCreateBody,
    });
  typia.assert(eventOrganizer);

  // Step 4: Event organizer login
  const eventOrgLoginBody = {
    email: eventOrgCreateBody.email,
    password_hash: eventOrgCreateBody.password_hash,
  } satisfies IEventRegistrationEventOrganizer.ILogin;
  const eventOrganizerLoggedIn: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.login(connection, {
      body: eventOrgLoginBody,
    });
  typia.assert(eventOrganizerLoggedIn);

  // Step 5: Switch to admin context to create event category
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: adminLoginBody,
  });

  const eventCategoryCreateBody = {
    name: RandomGenerator.pick(["conference", "workshop", "seminar"] as const),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IEventRegistrationEventCategory.ICreate;

  const eventCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      { body: eventCategoryCreateBody },
    );
  typia.assert(eventCategory);

  // Step 6: Switch to event organizer context again for event creation
  await api.functional.auth.eventOrganizer.login(connection, {
    body: eventOrgLoginBody,
  });

  const eventCreateBody = {
    event_category_id: eventCategory.id,
    name: RandomGenerator.paragraph({ sentences: 4 }),
    date: new Date(Date.now() + 86400000).toISOString(),
    location: RandomGenerator.name(),
    capacity: RandomGenerator.pick([20, 50, 100] as const),
    description: RandomGenerator.content({ paragraphs: 2 }),
    ticket_price: RandomGenerator.pick([0, 100, 250] as const),
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;

  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.eventOrganizer.events.create(
      connection,
      { body: eventCreateBody },
    );
  typia.assert(event);

  // Step 7: Create regular user + login
  const regularUserCreateBody = {
    email: RandomGenerator.pick([
      "user1@example.com",
      "user2@example.com",
    ] as const),
    password_hash: RandomGenerator.alphaNumeric(64),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationRegularUser.ICreate;

  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: regularUserCreateBody,
    });
  typia.assert(regularUser);

  const regularUserLoginBody = {
    email: regularUserCreateBody.email,
    password_hash: regularUserCreateBody.password_hash,
  } satisfies IEventRegistrationRegularUser.ILogin;

  const regularUserLoggedIn: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login.loginRegularUser(connection, {
      body: regularUserLoginBody,
    });
  typia.assert(regularUserLoggedIn);

  // Step 8: Create waitlist entry
  const waitlistCreateBody = {
    event_id: event.id,
    regular_user_id: regularUser.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IEventRegistrationEventWaitlists.ICreate;

  const waitlist: IEventRegistrationEventWaitlists =
    await api.functional.eventRegistration.regularUser.regularUsers.waitlists.createWaitlistEntry(
      connection,
      { regularUserId: regularUser.id, body: waitlistCreateBody },
    );
  typia.assert(waitlist);

  // Step 9: Switch back to admin context for waitlist retrieval
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: adminLoginBody,
  });

  // Step 10: Retrieve waitlist detailed info
  const waitlistDetail: IEventRegistrationEventWaitlist =
    await api.functional.eventRegistration.admin.eventWaitlists.at(connection, {
      eventWaitlistId: waitlist.id,
    });
  typia.assert(waitlistDetail);

  // Step 11: Assert retrieved data consistency
  TestValidator.equals("waitlist id", waitlistDetail.id, waitlist.id);
  TestValidator.equals(
    "waitlist event_id",
    waitlistDetail.event_id,
    waitlistCreateBody.event_id,
  );
  TestValidator.equals(
    "waitlist regular_user_id",
    waitlistDetail.regular_user_id,
    waitlistCreateBody.regular_user_id,
  );
  TestValidator.predicate(
    "waitlist created_at is a valid ISO date-time",
    typeof waitlistDetail.created_at === "string" &&
      !isNaN(Date.parse(waitlistDetail.created_at)),
  );
  TestValidator.predicate(
    "waitlist updated_at is a valid ISO date-time",
    typeof waitlistDetail.updated_at === "string" &&
      !isNaN(Date.parse(waitlistDetail.updated_at)),
  );
}
