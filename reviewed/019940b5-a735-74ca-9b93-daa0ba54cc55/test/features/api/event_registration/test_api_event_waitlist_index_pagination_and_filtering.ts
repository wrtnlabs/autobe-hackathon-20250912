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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventWaitlist";

/**
 * This test verifies the event registration system's waitlist retrieval API
 * used by event organizers.
 *
 * Scenario steps:
 *
 * 1. Create an event organizer user and login.
 * 2. Create an admin user and login.
 * 3. Admin creates an event category to classify events.
 * 4. Admin creates an event associated with the created category.
 * 5. Event organizer queries the waitlist of the created event with
 *    pagination.
 * 6. Event organizer tests pagination by changing page and limit.
 * 7. Event organizer tests filtering waitlists by a given regular user id.
 *
 * The test asserts correct API responses, proper pagination metadata, and
 * role-based access.
 */
export async function test_api_event_waitlist_index_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Event Organizer user creation and login
  const organizerEmail = typia.random<string & tags.Format<"email">>();
  const organizerPassword = RandomGenerator.alphaNumeric(12);
  const organizerCreateBody = {
    email: organizerEmail,
    password_hash: organizerPassword,
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationEventOrganizer.ICreate;

  const organizer: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: organizerCreateBody,
    });
  typia.assert(organizer);

  await api.functional.auth.eventOrganizer.login(connection, {
    body: {
      email: organizerCreateBody.email,
      password_hash: organizerCreateBody.password_hash,
    } satisfies IEventRegistrationEventOrganizer.ILogin,
  });

  // 2. Admin user creation and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminCreateBody = {
    email: adminEmail,
    password_hash: adminPassword,
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminCreateBody.email,
      password_hash: adminCreateBody.password_hash,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 3. Admin creates event category
  const eventCategoryCreateBody = {
    name: RandomGenerator.name(1),
    description: null,
  } satisfies IEventRegistrationEventCategory.ICreate;

  const eventCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: eventCategoryCreateBody,
      },
    );
  typia.assert(eventCategory);

  // 4. Admin creates event
  const eventCreateBody = {
    event_category_id: eventCategory.id,
    name: RandomGenerator.name(2),
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    location: RandomGenerator.name(3),
    capacity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    description: null,
    ticket_price: 0,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;

  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: eventCreateBody,
    });
  typia.assert(event);

  // Event organizer login again (role switch back)
  await api.functional.auth.eventOrganizer.login(connection, {
    body: {
      email: organizerCreateBody.email,
      password_hash: organizerCreateBody.password_hash,
    } satisfies IEventRegistrationEventOrganizer.ILogin,
  });

  // 5. Waitlist pagination query - page 1, limit 5
  const page1Body = {
    page: 1,
    limit: 5,
    event_id: event.id,
    regular_user_id: null,
  } satisfies IEventRegistrationEventWaitlist.IRequest;

  const page1: IPageIEventRegistrationEventWaitlist.ISummary =
    await api.functional.eventRegistration.eventOrganizer.events.waitlists.index(
      connection,
      {
        eventId: event.id,
        body: page1Body,
      },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "page 1 current page correct",
    page1.pagination.current === 1,
  );
  TestValidator.predicate("page 1 limit correct", page1.pagination.limit === 5);
  TestValidator.predicate(
    "page 1 records non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages non-negative",
    page1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page 1 pages consistent with records and limit",
    page1.pagination.pages >=
      Math.ceil(page1.pagination.records / page1.pagination.limit),
  );

  // 6. Waitlist pagination query - change to page 2, limit 3
  const page2Body = {
    page: 2,
    limit: 3,
    event_id: event.id,
    regular_user_id: null,
  } satisfies IEventRegistrationEventWaitlist.IRequest;

  const page2: IPageIEventRegistrationEventWaitlist.ISummary =
    await api.functional.eventRegistration.eventOrganizer.events.waitlists.index(
      connection,
      {
        eventId: event.id,
        body: page2Body,
      },
    );
  typia.assert(page2);
  TestValidator.predicate(
    "page 2 current page correct",
    page2.pagination.current === 2,
  );
  TestValidator.predicate("page 2 limit correct", page2.pagination.limit === 3);
  TestValidator.predicate(
    "page 2 records non-negative",
    page2.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 2 pages non-negative",
    page2.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page 2 pages consistent with records and limit",
    page2.pagination.pages >=
      Math.ceil(page2.pagination.records / page2.pagination.limit),
  );

  // 7. If there is at least one waitlist entry, test filtering by regular_user_id
  if (page1.data.length > 0) {
    const userIdFilter = page1.data[0].regular_user_id;
    const filterBody = {
      page: 1,
      limit: 5,
      event_id: event.id,
      regular_user_id: userIdFilter,
    } satisfies IEventRegistrationEventWaitlist.IRequest;

    const filteredPage: IPageIEventRegistrationEventWaitlist.ISummary =
      await api.functional.eventRegistration.eventOrganizer.events.waitlists.index(
        connection,
        {
          eventId: event.id,
          body: filterBody,
        },
      );
    typia.assert(filteredPage);

    // All filtered entries must have the requested regular_user_id
    for (const entry of filteredPage.data) {
      TestValidator.equals(
        "filtered waitlist entry matches regular_user_id",
        entry.regular_user_id,
        userIdFilter,
      );
    }
  }
}
