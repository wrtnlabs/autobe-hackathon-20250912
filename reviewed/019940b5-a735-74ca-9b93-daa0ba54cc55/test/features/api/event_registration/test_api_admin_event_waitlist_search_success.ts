import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCategory";
import type { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventWaitlist";

/**
 * Test the successful search and paginated listing of event waitlist
 * entries by an admin user.
 *
 * The test covers the full admin user workflow:
 *
 * 1. Admin joins and authenticates.
 * 2. Admin creates an event category.
 * 3. Admin creates an event under the created category.
 * 4. Admin searches the waitlist of that event with page and limit parameters.
 *
 * The responses at each stage are validated with typia.assert to ensure
 * type correctness. Pagination parameters and results are validated with
 * TestValidator to confirm correct behavior.
 */
export async function test_api_admin_event_waitlist_search_success(
  connection: api.IConnection,
) {
  // 1. Admin user joins
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: "hashed_password", // placeholder password hash
        full_name: RandomGenerator.name(),
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin user creates event category
  const eventCategoryName = RandomGenerator.name();
  const eventCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: {
          name: eventCategoryName,
          description: null,
        } satisfies IEventRegistrationEventCategory.ICreate,
      },
    );
  typia.assert(eventCategory);

  // 3. Admin user creates an event
  const futureDate = new Date(Date.now() + 86400000 * 30).toISOString(); // 30 days in the future
  const eventCreateBody = {
    event_category_id: eventCategory.id,
    name: RandomGenerator.name(),
    date: futureDate,
    location: RandomGenerator.name(),
    capacity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    description: null,
    ticket_price: 0, // A free event
    status: "scheduled" as const,
  } satisfies IEventRegistrationEvent.ICreate;
  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: eventCreateBody,
    });
  typia.assert(event);

  // 4. Prepare waitlist search request body
  const waitlistRequestBody: IEventRegistrationEventWaitlist.IRequest = {
    page: 1,
    limit: 5,
    event_id: event.id,
    regular_user_id: null,
  };

  // 5. Admin searches waitlist for the created event with pagination
  const waitlistResponse: IPageIEventRegistrationEventWaitlist.ISummary =
    await api.functional.eventRegistration.admin.events.waitlists.index(
      connection,
      {
        eventId: event.id,
        body: waitlistRequestBody,
      },
    );
  typia.assert(waitlistResponse);

  // 6. Validate pagination info
  TestValidator.equals(
    "pagination current page should be 1",
    waitlistResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 5",
    waitlistResponse.pagination.limit,
    5,
  );
}
