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
 * This test function validates the complete workflow of updating an event
 * waitlist entry by an admin user.
 *
 * It involves multiple roles: admin, event organizer, and regular user, with
 * authentication and role switching. The process includes:
 *
 * 1. Create and authenticate admin user
 * 2. Admin creates event category
 * 3. Create and authenticate event organizer user
 * 4. Event organizer creates an event
 * 5. Create and authenticate regular user
 * 6. Event organizer creates event waitlist entry for the regular user
 * 7. Admin updates the waitlist entry with modifications to timestamps or
 *    associations
 * 8. Validates that update was successful and data integrity is maintained
 */
export async function test_api_eventwaitlist_update_admin_success(
  connection: api.IConnection,
) {
  // 1. Admin user creation and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminCreateBody = {
    email: adminEmail,
    password_hash: adminPassword,
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
  TestValidator.equals(
    "admin email matches after creation",
    adminUser.email,
    adminCreateBody.email,
  );

  // Admin Login to confirm authentication context
  const adminLoginBody = {
    email: adminEmail,
    password_hash: adminPassword,
  } satisfies IEventRegistrationAdmin.ILogin;
  const adminLoggedIn: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 2. Admin creates event category
  const eventCategoryBody = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IEventRegistrationEventCategory.ICreate;
  const eventCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: eventCategoryBody,
      },
    );
  typia.assert(eventCategory);
  TestValidator.equals(
    "event category name matches",
    eventCategory.name,
    eventCategoryBody.name,
  );

  // 3. Create and authenticate event organizer user
  const organizerEmail = typia.random<string & tags.Format<"email">>();
  const organizerPassword = RandomGenerator.alphaNumeric(12);
  const organizerCreateBody = {
    email: organizerEmail,
    password_hash: organizerPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationEventOrganizer.ICreate;
  const organizerUser: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: organizerCreateBody,
    });
  typia.assert(organizerUser);
  TestValidator.equals(
    "event organizer email matches",
    organizerUser.email,
    organizerCreateBody.email,
  );

  // Event organizer login
  const organizerLoginBody = {
    email: organizerEmail,
    password_hash: organizerPassword,
  } satisfies IEventRegistrationEventOrganizer.ILogin;
  const organizerLoggedIn: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.login(connection, {
      body: organizerLoginBody,
    });
  typia.assert(organizerLoggedIn);

  // 4. Event organizer creates an event
  const eventBody = {
    event_category_id: eventCategory.id,
    name: RandomGenerator.name(3),
    date: new Date(Date.now() + 86400000).toISOString(), // 1 day in future
    location: RandomGenerator.name(2),
    capacity: 100,
    description: RandomGenerator.paragraph({ sentences: 8 }),
    ticket_price: 5000,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;
  const createdEvent: IEventRegistrationEvent =
    await api.functional.eventRegistration.eventOrganizer.events.create(
      connection,
      {
        body: eventBody,
      },
    );
  typia.assert(createdEvent);
  TestValidator.equals(
    "created event name matches",
    createdEvent.name,
    eventBody.name,
  );

  // 5. Create and authenticate regular user
  const regularEmail = typia.random<string & tags.Format<"email">>();
  const regularPassword = RandomGenerator.alphaNumeric(12);
  const regularUserCreateBody = {
    email: regularEmail,
    password_hash: regularPassword,
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
  TestValidator.equals(
    "regular user email matches",
    regularUser.email,
    regularUserCreateBody.email,
  );

  // Regular user login
  const regularUserLoginBody = {
    email: regularEmail,
    password_hash: regularPassword,
  } satisfies IEventRegistrationRegularUser.ILogin;
  const regularUserLoggedIn: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login.loginRegularUser(connection, {
      body: regularUserLoginBody,
    });
  typia.assert(regularUserLoggedIn);

  // Switch back to event organizer authentication for waitlist creation
  await api.functional.auth.eventOrganizer.login(connection, {
    body: organizerLoginBody,
  });

  // 6. Event organizer creates event waitlist entry for the regular user
  const waitlistCreateBody = {
    event_id: createdEvent.id,
    regular_user_id: regularUser.id,
  } satisfies IEventRegistrationEventWaitlist.ICreate;
  const waitlistEntry: IEventRegistrationEventWaitlist =
    await api.functional.eventRegistration.eventOrganizer.eventWaitlists.create(
      connection,
      {
        body: waitlistCreateBody,
      },
    );
  typia.assert(waitlistEntry);

  // 7. Switch to admin login context for updating waitlist
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: adminLoginBody,
  });

  // Prepare update data for waitlist entry
  const newCreatedAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour later
  const newUpdatedAt = new Date(Date.now() + 7200000).toISOString(); // 2 hours later
  const updateBody = {
    created_at: newCreatedAt,
    updated_at: newUpdatedAt,
  } satisfies IEventRegistrationEventWaitlist.IUpdate;

  const updatedWaitlistEntry: IEventRegistrationEventWaitlist =
    await api.functional.eventRegistration.admin.eventWaitlists.update(
      connection,
      {
        eventWaitlistId: waitlistEntry.id,
        body: updateBody,
      },
    );
  typia.assert(updatedWaitlistEntry);
  TestValidator.equals(
    "waitlist id remains the same",
    updatedWaitlistEntry.id,
    waitlistEntry.id,
  );
  TestValidator.equals(
    "waitlist event_id remains the same",
    updatedWaitlistEntry.event_id,
    waitlistEntry.event_id,
  );
  TestValidator.equals(
    "waitlist regular_user_id remains the same",
    updatedWaitlistEntry.regular_user_id,
    waitlistEntry.regular_user_id,
  );
  TestValidator.equals(
    "waitlist created_at updated",
    updatedWaitlistEntry.created_at,
    newCreatedAt,
  );
  TestValidator.equals(
    "waitlist updated_at updated",
    updatedWaitlistEntry.updated_at,
    newUpdatedAt,
  );
}
