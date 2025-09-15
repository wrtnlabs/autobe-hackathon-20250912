import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCategory";
import type { IEventRegistrationEventWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlist";
import type { IEventRegistrationEventWaitlists } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventWaitlists";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * Test updating an event waitlist entry by an admin user.
 *
 * This scenario involves multi-role authentication setups, event category and
 * event creation, regular user creation with verified email, waitlist creation
 * for a regular user, and admin updating waitlist entries with validation of
 * each step and business rule assertions.
 *
 * Steps:
 *
 * 1. Create and authenticate admin user.
 * 2. Create event category.
 * 3. Create event under the above category.
 * 4. Create and authenticate a regular user with verified email.
 * 5. Add this regular user to the event waitlist.
 * 6. Admin updates the waitlist entry with changed timestamps or associations.
 * 7. Validate that the update has been applied successfully.
 */
export async function test_api_event_waitlist_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user sign-up
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = RandomGenerator.alphaNumeric(40); // Simulate a hashed password

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

  // 2. Admin login
  const adminLoggedIn: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
      } satisfies IEventRegistrationAdmin.ILogin,
    });
  typia.assert(adminLoggedIn);

  // 3. Create event category
  const eventCategoryName = RandomGenerator.name(2);
  const eventCategoryDescription = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 5,
    wordMax: 10,
  });
  const eventCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: {
          name: eventCategoryName,
          description: eventCategoryDescription,
        } satisfies IEventRegistrationEventCategory.ICreate,
      },
    );
  typia.assert(eventCategory);

  // 4. Create event
  const laterISOString = new Date(
    Date.now() + 7 * 24 * 3600 * 1000,
  ).toISOString(); // 7 days later
  const eventLocation = RandomGenerator.name(2);

  const eventCreateBody = {
    event_category_id: eventCategory.id,
    name: RandomGenerator.name(3),
    date: laterISOString,
    location: eventLocation,
    capacity: 50,
    description: RandomGenerator.content({ paragraphs: 1 }),
    ticket_price: 0,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;

  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: eventCreateBody,
    });
  typia.assert(event);

  // 5. Create a regular user with email verified
  const regularUserEmail = typia.random<string & tags.Format<"email">>();
  const regularUserPasswordHash = RandomGenerator.alphaNumeric(40);

  const regularUserCreated: IEventRegistrationRegularUser.IAuthorized =
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
  typia.assert(regularUserCreated);

  // 6. Regular user login
  const regularUserLoggedIn: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login.loginRegularUser(connection, {
      body: {
        email: regularUserEmail,
        password_hash: regularUserPasswordHash,
      } satisfies IEventRegistrationRegularUser.ILogin,
    });
  typia.assert(regularUserLoggedIn);

  // 7. Regular user adds to waitlist
  const nowISOString = new Date().toISOString();
  const waitlistEntryCreateBody = {
    event_id: event.id,
    regular_user_id: regularUserCreated.id,
    created_at: nowISOString,
    updated_at: nowISOString,
  } satisfies IEventRegistrationEventWaitlists.ICreate;

  const waitlistEntry: IEventRegistrationEventWaitlists =
    await api.functional.eventRegistration.regularUser.regularUsers.waitlists.createWaitlistEntry(
      connection,
      {
        regularUserId: regularUserCreated.id,
        body: waitlistEntryCreateBody,
      },
    );
  typia.assert(waitlistEntry);

  // 8. Admin updates the waitlist entry
  const updatedAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes later
  const updateBody = {
    event_id: event.id,
    regular_user_id: regularUserCreated.id,
    created_at: waitlistEntry.created_at,
    updated_at: updatedAt,
  } satisfies IEventRegistrationEventWaitlist.IUpdate;

  const updatedWaitlist: IEventRegistrationEventWaitlist =
    await api.functional.eventRegistration.admin.events.waitlists.update(
      connection,
      {
        eventId: event.id,
        eventWaitlistId: waitlistEntry.id,
        body: updateBody,
      },
    );
  typia.assert(updatedWaitlist);

  // 9. Validate the update
  TestValidator.equals(
    "updated waitlist event ID",
    updatedWaitlist.event_id,
    event.id,
  );
  TestValidator.equals(
    "updated waitlist regular user ID",
    updatedWaitlist.regular_user_id,
    regularUserCreated.id,
  );
  TestValidator.equals(
    "updated waitlist created_at",
    updatedWaitlist.created_at,
    waitlistEntry.created_at,
  );
  TestValidator.equals(
    "updated waitlist updated_at",
    updatedWaitlist.updated_at,
    updatedAt,
  );
}
