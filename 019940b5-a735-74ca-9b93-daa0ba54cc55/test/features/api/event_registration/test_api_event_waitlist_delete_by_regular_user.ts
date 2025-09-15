import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCategory";
import type { IEventRegistrationEventWaitlists } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlists";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * Test deleting a waitlist entry for an event by the regular user who is
 * waitlisted. This test covers the entire business flow from creation and
 * authentication of an admin user, creation of an event category and an event,
 * creation and authentication of a regular user, the addition of the regular
 * user to the event waitlist, and finally the deletion of that waitlist entry
 * by the regular user.
 *
 * The test verifies authorization, ownership, and proper deletion handling with
 * no response body. It also properly switches authentication contexts between
 * admin and regular users to carry out operations permitted to each role.
 */
export async function test_api_event_waitlist_delete_by_regular_user(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin user
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@admin.com`;
  const adminPassword = "hashed_admin_pass";
  const adminAuthorized: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // 2. Switch to admin login
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 3. Create event category
  const eventCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: {
          name: `Category-${RandomGenerator.alphaNumeric(5)}`,
          description: "Category for automated test event",
        } satisfies IEventRegistrationEventCategory.ICreate,
      },
    );
  typia.assert(eventCategory);

  // 4. Create event linked to category
  const eventDate = new Date(Date.now() + 86400000).toISOString(); // +1 day
  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: {
        event_category_id: eventCategory.id,
        name: `Test Event ${RandomGenerator.alphaNumeric(5)}`,
        date: eventDate,
        location: "Test Location",
        capacity: 10,
        description: "Automated test event description",
        ticket_price: 0,
        status: "scheduled",
      } satisfies IEventRegistrationEvent.ICreate,
    });
  typia.assert(event);

  // 5. Create and authenticate regular user
  const regularUserEmail = `${RandomGenerator.alphaNumeric(8)}@user.com`;
  const regularUserPassword = "hashed_user_pass";
  const regularUserAuthorized: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: {
        email: regularUserEmail,
        password_hash: regularUserPassword,
        full_name: RandomGenerator.name(),
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationRegularUser.ICreate,
    });
  typia.assert(regularUserAuthorized);

  // 6. Switch to regular user login
  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: {
      email: regularUserEmail,
      password_hash: regularUserPassword,
    } satisfies IEventRegistrationRegularUser.ILogin,
  });

  // 7. Add regular user to the event waitlist
  const waitlistEntry: IEventRegistrationEventWaitlists =
    await api.functional.eventRegistration.regularUser.regularUsers.waitlists.createWaitlistEntry(
      connection,
      {
        regularUserId: regularUserAuthorized.id,
        body: {
          event_id: event.id,
          regular_user_id: regularUserAuthorized.id,
        } satisfies IEventRegistrationEventWaitlists.ICreate,
      },
    );
  typia.assert(waitlistEntry);

  // 8. Delete the waitlist entry by the regular user
  await api.functional.eventRegistration.regularUser.events.waitlists.eraseWaitlistEntry(
    connection,
    {
      eventId: event.id,
      eventWaitlistId: waitlistEntry.id,
    },
  );
}
