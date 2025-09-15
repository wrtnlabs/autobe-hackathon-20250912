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
 * Validate that an event organizer can query the waitlist entries for a
 * specific regular user.
 *
 * This test performs:
 *
 * 1. Admin role creation and login for admin privileges.
 * 2. Event organizer creation and login.
 * 3. Regular user creation and login.
 * 4. Admin creates an event category.
 * 5. Event organizer creates an event in that category.
 * 6. Regular user adds a waitlist entry for the event.
 * 7. Event organizer queries waitlist entries filtering by the regular user.
 *
 * It validates correct authorization context switching, ensuring only valid
 * users access or modify resources. It verifies that the queried waitlist
 * entries belong to the regular user and the event created earlier.
 */
export async function test_api_event_organizer_query_regular_user_waitlists(
  connection: api.IConnection,
) {
  // 1. Create admin user and log in
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(6)}@test.com`;
  const adminPasswordHash = RandomGenerator.alphaNumeric(20);
  const admin: IEventRegistrationAdmin.IAuthorized =
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
  typia.assert(admin);

  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPasswordHash,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 2. Create event organizer and log in
  const organizerEmail = `organizer_${RandomGenerator.alphaNumeric(6)}@test.com`;
  const organizerPasswordHash = RandomGenerator.alphaNumeric(20);
  const organizer: IEventRegistrationEventOrganizer.IAuthorized =
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
  typia.assert(organizer);

  await api.functional.auth.eventOrganizer.login(connection, {
    body: {
      email: organizerEmail,
      password_hash: organizerPasswordHash,
    } satisfies IEventRegistrationEventOrganizer.ILogin,
  });

  // 3. Create regular user and log in
  const userEmail = `user_${RandomGenerator.alphaNumeric(6)}@test.com`;
  const userPasswordHash = RandomGenerator.alphaNumeric(20);
  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: {
        email: userEmail,
        password_hash: userPasswordHash,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationRegularUser.ICreate,
    });
  typia.assert(regularUser);

  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: {
      email: userEmail,
      password_hash: userPasswordHash,
    } satisfies IEventRegistrationRegularUser.ILogin,
  });

  // 4. As admin, create an event category
  const categoryName = `cat_${RandomGenerator.alphaNumeric(6)}`;
  const eventCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: {
          name: categoryName,
          description: `Description for ${categoryName}`,
        } satisfies IEventRegistrationEventCategory.ICreate,
      },
    );
  typia.assert(eventCategory);

  // Switch back to event organizer context
  await api.functional.auth.eventOrganizer.login(connection, {
    body: {
      email: organizerEmail,
      password_hash: organizerPasswordHash,
    } satisfies IEventRegistrationEventOrganizer.ILogin,
  });

  // 5. Event organizer creates an event
  const futureDate = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const eventName = `Event_${RandomGenerator.alphaNumeric(6)}`;
  const eventCapacity: number & tags.Type<"int32"> & tags.Minimum<1> =
    typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>();
  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.eventOrganizer.events.create(
      connection,
      {
        body: {
          event_category_id: eventCategory.id,
          name: eventName,
          date: futureDate,
          location: `Location_${RandomGenerator.alphaNumeric(4)}`,
          capacity: eventCapacity,
          description: `Description for ${eventName}`,
          ticket_price: 100,
          status: "scheduled",
        } satisfies IEventRegistrationEvent.ICreate,
      },
    );
  typia.assert(event);

  // 6. Regular user adds to waitlist for event
  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: {
      email: userEmail,
      password_hash: userPasswordHash,
    } satisfies IEventRegistrationRegularUser.ILogin,
  });

  const waitlistEntry: IEventRegistrationEventWaitlists =
    await api.functional.eventRegistration.regularUser.regularUsers.waitlists.createWaitlistEntry(
      connection,
      {
        regularUserId: regularUser.id,
        body: {
          event_id: event.id,
          regular_user_id: regularUser.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } satisfies IEventRegistrationEventWaitlists.ICreate,
      },
    );
  typia.assert(waitlistEntry);
  TestValidator.equals(
    "waitlist entry event_id equals event.id",
    waitlistEntry.event_id,
    event.id,
  );
  TestValidator.equals(
    "waitlist entry regular_user_id equals regularUser.id",
    waitlistEntry.regular_user_id,
    regularUser.id,
  );

  // 7. Event organizer queries waitlist entries for the regular user
  await api.functional.auth.eventOrganizer.login(connection, {
    body: {
      email: organizerEmail,
      password_hash: organizerPasswordHash,
    } satisfies IEventRegistrationEventOrganizer.ILogin,
  });

  const waitlistQueryResult: IPageIEventRegistrationEventWaitlist.ISummary =
    await api.functional.eventRegistration.eventOrganizer.regularUsers.waitlists.index(
      connection,
      {
        regularUserId: regularUser.id,
        body: {
          page: 1,
          limit: 10,
          event_id: event.id,
          regular_user_id: regularUser.id,
        } satisfies IEventRegistrationEventWaitlist.IRequest,
      },
    );
  typia.assert(waitlistQueryResult);

  TestValidator.predicate(
    "waitlist query results include at least one entry",
    waitlistQueryResult.data.length > 0,
  );
  TestValidator.predicate(
    "all waitlist entries regular_user_id match",
    waitlistQueryResult.data.every(
      (entry) => entry.regular_user_id === regularUser.id,
    ),
  );
  TestValidator.predicate(
    "all waitlist entries event_id match",
    waitlistQueryResult.data.every((entry) => entry.event_id === event.id),
  );
  TestValidator.predicate(
    "pagination current page is 1",
    waitlistQueryResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    waitlistQueryResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records are non-negative",
    waitlistQueryResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages are positive",
    waitlistQueryResult.pagination.pages >= 1,
  );
}
