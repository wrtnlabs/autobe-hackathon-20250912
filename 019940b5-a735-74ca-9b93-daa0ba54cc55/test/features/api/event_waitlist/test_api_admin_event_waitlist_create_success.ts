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
 * Validates that an admin user can create a waitlist entry for a regular
 * user on an event.
 *
 * This E2E test covers the complete workflow:
 *
 * 1. Create and authenticate an admin user.
 * 2. Create an event category for classifying events.
 * 3. Create an event under the created category.
 * 4. Create a regular user account.
 * 5. As the admin, add the regular user to the event's waitlist.
 * 6. Validate that all entities are created with correct data and
 *    associations.
 *
 * All data respects the specified formats and required properties. This
 * ensures the admin role is correctly authorized to manage event waitlists
 * and the user can be successfully queued for event participation.
 */
export async function test_api_admin_event_waitlist_create_success(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin user
  const adminEmail = `${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}@company.com`;
  const adminPassword = "SecurePass!1234";
  const adminCreateBody = {
    email: adminEmail,
    password_hash: adminPassword,
    full_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;
  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // Step 2: Login as admin to set authorization token
  const adminLoginBody = {
    email: adminEmail,
    password_hash: adminPassword,
  } satisfies IEventRegistrationAdmin.ILogin;
  const adminLogin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // Step 3: Create an event category
  const eventCategoryCreateBody = {
    name: RandomGenerator.name(1).replace(/\s/g, "").toLowerCase(),
    description: null,
  } satisfies IEventRegistrationEventCategory.ICreate;
  const eventCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      { body: eventCategoryCreateBody },
    );
  typia.assert(eventCategory);

  // Step 4: Create an event
  const nowISO = new Date().toISOString();
  const eventCreateBody = {
    event_category_id: eventCategory.id,
    name: RandomGenerator.name(2),
    date: nowISO,
    location: RandomGenerator.name(1),
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

  // Step 5: Create a regular user
  const regularUserEmail = `${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}@user.com`;
  const regularUserPassword = "UserPass!5678";
  const regularUserCreateBody = {
    email: regularUserEmail,
    password_hash: regularUserPassword,
    full_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationRegularUser.ICreate;
  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: regularUserCreateBody,
    });
  typia.assert(regularUser);

  // Step 6: Add regular user to the event waitlist as admin
  const waitlistCreateBody = {
    event_id: event.id,
    regular_user_id: regularUser.id,
  } satisfies IEventRegistrationEventWaitlist.ICreate;
  const waitlistEntry: IEventRegistrationEventWaitlist =
    await api.functional.eventRegistration.admin.events.waitlists.create(
      connection,
      {
        eventId: event.id,
        body: waitlistCreateBody,
      },
    );
  typia.assert(waitlistEntry);

  // Assert waitlist associations
  TestValidator.equals(
    "waitlist associates correct event",
    waitlistEntry.event_id,
    event.id,
  );
  TestValidator.equals(
    "waitlist associates correct user",
    waitlistEntry.regular_user_id,
    regularUser.id,
  );
  TestValidator.predicate(
    "waitlist has creation timestamp",
    waitlistEntry.created_at !== "" && waitlistEntry.created_at !== null,
  );
  TestValidator.predicate(
    "waitlist has update timestamp",
    waitlistEntry.updated_at !== "" && waitlistEntry.updated_at !== null,
  );
}
