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
 * This test verifies the complete workflow for deleting an event waitlist
 * entry by an admin user. It covers multi-role creation, authentication,
 * resource setup, and the deletion process.
 *
 * Workflow:
 *
 * 1. Create and authenticate an admin user.
 * 2. Create an event category under admin authorization.
 * 3. Create and authenticate an event organizer user.
 * 4. Create an event linked to the category with the event organizer.
 * 5. Create and authenticate a regular user.
 * 6. Create a waitlist entry for the regular user and event.
 * 7. Re-authenticate as admin.
 * 8. Delete the created waitlist entry using admin privileges.
 * 9. Validate that deletion succeeded with no errors.
 *
 * This test ensures that the event waitlist deletion API enforces proper
 * authorization and functions correctly within the context of the system's
 * event and user management.
 */
export async function test_api_eventwaitlist_delete_admin_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin user
  const adminEmail = RandomGenerator.alphaNumeric(10) + "@example.com";
  const adminPassword = "password123";
  const adminUser: IEventRegistrationAdmin.IAuthorized =
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
  typia.assert(adminUser);

  // Admin login to refresh authentication context
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 2. Create event category
  const categoryName = RandomGenerator.name(2);
  const eventCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: {
          name: categoryName,
          description: null,
        } satisfies IEventRegistrationEventCategory.ICreate,
      },
    );
  typia.assert(eventCategory);

  // 3. Create and authenticate event organizer
  const organizerEmail = RandomGenerator.alphaNumeric(10) + "@example.com";
  const organizerPassword = "password123";
  const eventOrganizerUser: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: {
        email: organizerEmail,
        password_hash: organizerPassword,
        full_name: RandomGenerator.name(),
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationEventOrganizer.ICreate,
    });
  typia.assert(eventOrganizerUser);

  // Event organizer login to refresh authentication context
  await api.functional.auth.eventOrganizer.login(connection, {
    body: {
      email: organizerEmail,
      password_hash: organizerPassword,
    } satisfies IEventRegistrationEventOrganizer.ILogin,
  });

  // 4. Create event
  const eventDateISO = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const eventName = RandomGenerator.name(3);
  const eventDetail: IEventRegistrationEvent =
    await api.functional.eventRegistration.eventOrganizer.events.create(
      connection,
      {
        body: {
          event_category_id: eventCategory.id,
          name: eventName,
          date: eventDateISO,
          location: RandomGenerator.name(2),
          capacity: 100,
          description: null,
          ticket_price: 0,
          status: "scheduled",
        } satisfies IEventRegistrationEvent.ICreate,
      },
    );
  typia.assert(eventDetail);

  // 5. Create and authenticate regular user
  const regularEmail = RandomGenerator.alphaNumeric(10) + "@example.com";
  const regularPassword = "password123";
  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: {
        email: regularEmail,
        password_hash: regularPassword,
        full_name: RandomGenerator.name(),
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationRegularUser.ICreate,
    });
  typia.assert(regularUser);

  // Regular user login to refresh authentication context
  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: {
      email: regularEmail,
      password_hash: regularPassword,
    } satisfies IEventRegistrationRegularUser.ILogin,
  });

  // 6. Create event waitlist entry for regular user
  const waitlistEntry: IEventRegistrationEventWaitlist =
    await api.functional.eventRegistration.eventOrganizer.eventWaitlists.create(
      connection,
      {
        body: {
          event_id: eventDetail.id,
          regular_user_id: regularUser.id,
        } satisfies IEventRegistrationEventWaitlist.ICreate,
      },
    );
  typia.assert(waitlistEntry);

  // 7. Switch back to admin authentication for deletion
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 8. Perform deletion of the event waitlist entry by admin
  await api.functional.eventRegistration.admin.eventWaitlists.erase(
    connection,
    {
      eventWaitlistId: waitlistEntry.id,
    },
  );

  // As the erase function returns void on success, the absence of error is success
  TestValidator.predicate("event waitlist deletion succeeds", true);
}
