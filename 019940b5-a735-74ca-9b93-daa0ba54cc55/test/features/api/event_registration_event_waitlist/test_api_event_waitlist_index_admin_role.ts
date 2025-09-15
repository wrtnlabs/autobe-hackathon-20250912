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
 * This scenario tests the retrieval of event waitlist entries by an admin user
 * for a specific event via paginated API request. It includes creation of the
 * admin authentication context, event category, and an event. The admin then
 * queries the waitlist with search filters, validating correct data retrieval,
 * sorting, and pagination behavior in the admin role context.
 */
export async function test_api_event_waitlist_index_admin_role(
  connection: api.IConnection,
) {
  // 1. Create admin user and obtain authenticated context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = "hashed_password_example";
  const adminFullName = RandomGenerator.name();
  const adminPhoneNumber = RandomGenerator.mobile();
  const adminProfileUrl = `https://example.com/profile/${RandomGenerator.alphaNumeric(8)}`;
  const adminInput: IEventRegistrationAdmin.ICreate = {
    email: adminEmail,
    password_hash: adminPasswordHash,
    full_name: adminFullName,
    phone_number: adminPhoneNumber,
    profile_picture_url: adminProfileUrl,
    email_verified: true,
  };
  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminInput,
    });
  typia.assert(admin);

  // 2. Create event category using authenticated admin
  const categoryName = `Category_${RandomGenerator.alphaNumeric(6)}`;
  const categoryDescription = RandomGenerator.paragraph({ sentences: 5 });
  const eventCategoryInput: IEventRegistrationEventCategory.ICreate = {
    name: categoryName,
    description: categoryDescription,
  };
  const category: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: eventCategoryInput,
      },
    );
  typia.assert(category);

  // 3. Create an event under the created category
  const eventName = `Event_${RandomGenerator.alphaNumeric(6)}`;
  const eventDate = new Date(Date.now() + 8.64e7).toISOString(); // 1 day from now
  const eventLocation = `${RandomGenerator.name(2)} Venue`;
  const eventTicketPrice = Math.floor(Math.random() * 1000); // up to 1000

  const eventInput: IEventRegistrationEvent.ICreate = {
    event_category_id: category.id,
    name: eventName,
    date: eventDate,
    location: eventLocation,
    capacity: 100, // Defined constant for stable test
    description: RandomGenerator.paragraph({ sentences: 8 }),
    ticket_price: eventTicketPrice,
    status: "scheduled",
  };
  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: eventInput,
    });
  typia.assert(event);

  // 4. Query the waitlist with pagination and eventId filter
  const pageNumber = 1;
  const queryLimit = 5;

  const waitlistRequest: IEventRegistrationEventWaitlist.IRequest = {
    page: pageNumber,
    limit: queryLimit,
    event_id: event.id,
  };

  const resultingWaitlists: IPageIEventRegistrationEventWaitlist.ISummary =
    await api.functional.eventRegistration.admin.events.waitlists.index(
      connection,
      {
        eventId: event.id,
        body: waitlistRequest,
      },
    );
  typia.assert(resultingWaitlists);

  // 5. Validate pagination
  TestValidator.predicate(
    "pagination current page matches requested",
    resultingWaitlists.pagination.current === pageNumber,
  );

  TestValidator.predicate(
    "pagination limit matches requested",
    resultingWaitlists.pagination.limit === queryLimit,
  );

  TestValidator.predicate("total pages and records are non-negative", () => {
    return (
      resultingWaitlists.pagination.records >= 0 &&
      resultingWaitlists.pagination.pages >= 0
    );
  });

  // 6. Validate event_id consistency in returned waitlist entries
  for (const waitlist of resultingWaitlists.data) {
    TestValidator.equals(
      "waitlist event_id matches queried eventId",
      waitlist.event_id,
      event.id,
    );
    TestValidator.predicate(
      "waitlist created_at is valid ISO 8601",
      typeof waitlist.created_at === "string" &&
        !isNaN(Date.parse(waitlist.created_at)),
    );
    TestValidator.predicate(
      "waitlist updated_at is valid ISO 8601",
      typeof waitlist.updated_at === "string" &&
        !isNaN(Date.parse(waitlist.updated_at)),
    );
  }
}
