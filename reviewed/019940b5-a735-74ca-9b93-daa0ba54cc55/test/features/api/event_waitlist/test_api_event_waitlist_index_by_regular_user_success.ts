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
 * This E2E test verifies the workflow of creating admin and event organizer
 * users, creating event categories and events, registering a regular user,
 * managing waitlists, and querying the regular user's event waitlist entries
 * with pagination and filtering. It validates the correctness of actor role
 * executions, data relationships, and response structures for the paginated
 * waitlist retrieval API endpoint.
 *
 * Workflow:
 *
 * 1. Admin user joins and logs in.
 * 2. Admin creates two event categories.
 * 3. Event organizer joins and logs in.
 * 4. Event organizer creates two events.
 * 5. Regular user joins and logs in.
 * 6. Regular user creates waitlist entries for both events.
 * 7. Query waitlist entries for the regular user with pagination.
 * 8. Validate pagination metadata and returned waitlist entries.
 */
export async function test_api_event_waitlist_index_by_regular_user_success(
  connection: api.IConnection,
) {
  // 1. Admin user joins
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = RandomGenerator.alphaNumeric(40); // simulate hash
  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(adminUser);

  // 2. Admin creates event categories
  const category1: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: "Category 1 description",
        } satisfies IEventRegistrationEventCategory.ICreate,
      },
    );
  typia.assert(category1);

  const category2: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: "Category 2 description",
        } satisfies IEventRegistrationEventCategory.ICreate,
      },
    );
  typia.assert(category2);

  // 3. Event organizer joins
  const organizerEmail = typia.random<string & tags.Format<"email">>();
  const organizerPasswordHash = RandomGenerator.alphaNumeric(40); // simulate hash
  const organizerUser: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: {
        email: organizerEmail,
        password_hash: organizerPasswordHash,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationEventOrganizer.ICreate,
    });
  typia.assert(organizerUser);

  // 4. Event organizer creates events
  const event1: IEventRegistrationEvent =
    await api.functional.eventRegistration.eventOrganizer.events.create(
      connection,
      {
        body: {
          event_category_id: category1.id,
          name: "Event 1 - " + RandomGenerator.name(2),
          date: new Date().toISOString(),
          location: "Location 1",
          capacity: 10,
          description: "Description for event 1",
          ticket_price: 100,
          status: "scheduled",
        } satisfies IEventRegistrationEvent.ICreate,
      },
    );
  typia.assert(event1);

  const event2: IEventRegistrationEvent =
    await api.functional.eventRegistration.eventOrganizer.events.create(
      connection,
      {
        body: {
          event_category_id: category2.id,
          name: "Event 2 - " + RandomGenerator.name(2),
          date: new Date().toISOString(),
          location: "Location 2",
          capacity: 15,
          description: "Description for event 2",
          ticket_price: 150,
          status: "scheduled",
        } satisfies IEventRegistrationEvent.ICreate,
      },
    );
  typia.assert(event2);

  // 5. Regular user joins
  const regularUserEmail = typia.random<string & tags.Format<"email">>();
  const regularUserPasswordHash = RandomGenerator.alphaNumeric(40); // simulate hash
  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: {
        email: regularUserEmail,
        password_hash: regularUserPasswordHash,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationRegularUser.ICreate,
    });
  typia.assert(regularUser);

  // 6. Regular user creates waitlist entries for both events
  const waitlistEntry1: IEventRegistrationEventWaitlists =
    await api.functional.eventRegistration.regularUser.regularUsers.waitlists.createWaitlistEntry(
      connection,
      {
        regularUserId: regularUser.id,
        body: {
          event_id: event1.id,
          regular_user_id: regularUser.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } satisfies IEventRegistrationEventWaitlists.ICreate,
      },
    );
  typia.assert(waitlistEntry1);

  const waitlistEntry2: IEventRegistrationEventWaitlists =
    await api.functional.eventRegistration.regularUser.regularUsers.waitlists.createWaitlistEntry(
      connection,
      {
        regularUserId: regularUser.id,
        body: {
          event_id: event2.id,
          regular_user_id: regularUser.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } satisfies IEventRegistrationEventWaitlists.ICreate,
      },
    );
  typia.assert(waitlistEntry2);

  // 7. Query waitlist entries for the regular user
  const waitlistPage: IPageIEventRegistrationEventWaitlist.ISummary =
    await api.functional.eventRegistration.regularUser.regularUsers.waitlists.index(
      connection,
      {
        regularUserId: regularUser.id,
        body: {
          page: 1,
          limit: 2,
          regular_user_id: regularUser.id,
          event_id: null,
        } satisfies IEventRegistrationEventWaitlist.IRequest,
      },
    );
  typia.assert(waitlistPage);

  // 8. Validate pagination metadata
  TestValidator.equals(
    "page.current should be 1",
    waitlistPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "page.limit should be 2",
    waitlistPage.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "page.records should be >= 2",
    waitlistPage.pagination.records >= 2,
  );
  TestValidator.predicate(
    "page.pages should be >= 1",
    waitlistPage.pagination.pages >= 1,
  );

  // 9. Validate returned waitlist entries contain the created entries
  const waitlistIds = waitlistPage.data.map((entry) => entry.id);

  TestValidator.predicate(
    "waitlistEntry1.id should be in the page data",
    waitlistIds.includes(waitlistEntry1.id),
  );
  TestValidator.predicate(
    "waitlistEntry2.id should be in the page data",
    waitlistIds.includes(waitlistEntry2.id),
  );

  // 10. Validate event_id matches in the waitlist entries
  const eventIds = waitlistPage.data.map((entry) => entry.event_id);
  TestValidator.predicate(
    "event1.id in waitlist page data",
    eventIds.includes(event1.id),
  );
  TestValidator.predicate(
    "event2.id in waitlist page data",
    eventIds.includes(event2.id),
  );
}
