import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import type { IEventRegistrationEventCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventAttendee";

/**
 * Test a successful retrieval of paginated event attendees as an admin user.
 *
 * This test checks the full admin workflow including creating an admin user,
 * logging in, creating an event category and event, and querying the event
 * attendees with pagination. It verifies correct authentication context, entity
 * creation, and pagination response.
 *
 * Steps:
 *
 * 1. Admin user sign-up and authentication.
 * 2. Admin user logs in to set authorization.
 * 3. Create event category.
 * 4. Create event linked to category.
 * 5. Query event attendees using pagination.
 * 6. Assert pagination metadata and attendee list integrity.
 */
export async function test_api_event_attendees_index_admin_success(
  connection: api.IConnection,
) {
  // Step 1: Create admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;
  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminUser);

  // Step 2: Admin user login to switch authentication context
  const adminLoginBody = {
    email: adminEmail,
    password_hash: adminCreateBody.password_hash,
  } satisfies IEventRegistrationAdmin.ILogin;
  const loggedInAdmin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // Step 3: Create event category
  const eventCategoryCreateBody = {
    name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 10,
    }).trim(),
    description: null,
  } satisfies IEventRegistrationEventCategory.ICreate;
  const eventCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      { body: eventCategoryCreateBody },
    );
  typia.assert(eventCategory);

  // Step 4: Create an event linked with event category
  const eventCreateBody = {
    event_category_id: eventCategory.id,
    name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 15,
    }).trim(),
    date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow's date
    location: RandomGenerator.paragraph({ sentences: 1 }).trim(),
    capacity: 100,
    description: null,
    ticket_price: 0,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;
  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: eventCreateBody,
    });
  typia.assert(event);

  // Step 5: Perform paginated search for event attendees
  // Using default pagination parameters with filtering by event id
  const attendeeSearchBody = {
    page: 1,
    limit: 10,
    event_id: event.id,
    regular_user_id: null,
    created_at: null,
  } satisfies IEventRegistrationEventAttendee.IRequest;

  const attendeesPage: IPageIEventRegistrationEventAttendee.ISummary =
    await api.functional.eventRegistration.admin.eventAttendees.index(
      connection,
      { body: attendeeSearchBody },
    );
  typia.assert(attendeesPage);

  // Step 6: Validate pagination and data
  TestValidator.predicate(
    "pagination current page is 1",
    attendeesPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    attendeesPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records and pages are non-negative",
    attendeesPage.pagination.records >= 0 &&
      attendeesPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "attendees data array is present",
    Array.isArray(attendeesPage.data),
  );
}
