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
 * This test verifies the retrieval of a specific event waitlist entry's
 * detailed information by an event organizer user, ensuring that authorization
 * and data consistency are maintained across multiple user roles. The scenario
 * is implemented as follows:
 *
 * 1. Event organizer user is created and authenticated.
 * 2. Admin user is created and authenticated.
 * 3. Admin creates an event category.
 * 4. Admin creates an event within the created category.
 * 5. Regular user is created and authenticated.
 * 6. As event organizer, a waitlist entry is created linking the regular user to
 *    the event.
 * 7. The event organizer retrieves the waitlist entry details using eventId and
 *    waitlistId.
 * 8. Assertions are performed to validate data integrity and correct access
 *    control.
 *
 * Data generation uses realistic values following the provided DTO constraints,
 * including UUIDs, ISO 8601 date-time strings, and business-specific property
 * constraints. Every step awaits API calls to ensure sequential execution, and
 * typia.assert is used to validate response types precisely. TestValidator
 * validates equality and predicates for verifying correctness and completeness
 * of the workflow.
 */
export async function test_api_event_waitlist_retrieve_detail_event_organizer(
  connection: api.IConnection,
) {
  // 1. Create and authenticate event organizer
  const organizerEmail = typia.random<string & tags.Format<"email">>();
  const organizerPassword = RandomGenerator.alphaNumeric(12);
  const eventOrganizer: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: {
        email: organizerEmail,
        password_hash: organizerPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationEventOrganizer.ICreate,
    });
  typia.assert(eventOrganizer);

  // 2. Create and authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(admin);

  // 3. Admin creates event category
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
    } satisfies IEventRegistrationAdmin.ILogin,
  });
  const eventCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: {
          name: "TestCategory" + RandomGenerator.alphaNumeric(4),
          description: "Test event category",
        } satisfies IEventRegistrationEventCategory.ICreate,
      },
    );
  typia.assert(eventCategory);

  // 4. Admin creates event
  const eventDate = new Date();
  eventDate.setDate(eventDate.getDate() + 30); // 30 days in future
  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: {
        event_category_id: eventCategory.id,
        name: "Test Event " + RandomGenerator.alphaNumeric(3),
        date: eventDate.toISOString(),
        location: "Conference Hall A",
        capacity: 100,
        description: "Test event description",
        ticket_price: 50,
        status: "scheduled",
      } satisfies IEventRegistrationEvent.ICreate,
    });
  typia.assert(event);

  // 5. Create and authenticate regular user
  const regularUserEmail = typia.random<string & tags.Format<"email">>();
  const regularUserPassword = RandomGenerator.alphaNumeric(12);
  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: {
        email: regularUserEmail,
        password_hash: regularUserPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationRegularUser.ICreate,
    });
  typia.assert(regularUser);

  // 6. Event organizer logs in
  await api.functional.auth.eventOrganizer.login(connection, {
    body: {
      email: organizerEmail,
      password_hash: organizerPassword,
    } satisfies IEventRegistrationEventOrganizer.ILogin,
  });

  // 7. Create waitlist entry for regular user as event organizer
  const waitlistEntry: IEventRegistrationEventWaitlist =
    await api.functional.eventRegistration.eventOrganizer.events.waitlists.create(
      connection,
      {
        eventId: event.id,
        body: {
          event_id: event.id,
          regular_user_id: regularUser.id,
        } satisfies IEventRegistrationEventWaitlist.ICreate,
      },
    );
  typia.assert(waitlistEntry);

  // 8. Retrieve detailed waitlist entry as event organizer
  const retrievedWaitlist: IEventRegistrationEventWaitlist =
    await api.functional.eventRegistration.eventOrganizer.events.waitlists.at(
      connection,
      {
        eventId: event.id,
        eventWaitlistId: waitlistEntry.id,
      },
    );
  typia.assert(retrievedWaitlist);

  // 9. Validate the retrieved waitlist matches created
  TestValidator.equals("waitlist id", retrievedWaitlist.id, waitlistEntry.id);
  TestValidator.equals(
    "waitlist event_id",
    retrievedWaitlist.event_id,
    event.id,
  );
  TestValidator.equals(
    "waitlist regular_user_id",
    retrievedWaitlist.regular_user_id,
    regularUser.id,
  );
  TestValidator.predicate(
    "waitlist created_at is valid ISO string",
    typeof retrievedWaitlist.created_at === "string" &&
      retrievedWaitlist.created_at.length > 0,
  );
  TestValidator.predicate(
    "waitlist updated_at is valid ISO string",
    typeof retrievedWaitlist.updated_at === "string" &&
      retrievedWaitlist.updated_at.length > 0,
  );
}
