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
 * This end-to-end test validates the successful creation of a new event
 * waitlist entry by the event organizer for a regular user waiting for an
 * event. The test simulates a realistic multi-role scenario involving admin,
 * event organizer, and regular user accounts, verifying proper authentication
 * and data dependencies.
 *
 * Process:
 *
 * 1. Create an admin user via the admin join endpoint, then log in as admin.
 * 2. Using admin authentication, create a new event category.
 * 3. Create an event organizer user (join and login) and authenticate.
 * 4. The event organizer creates a new event under the previously created
 *    category.
 * 5. Create and authenticate a regular user.
 * 6. Switch to event organizer authentication, then create a waitlist entry
 *    associating the regular user with the event.
 * 7. Validate that the waitlist entry is created and has the expected properties
 *    with correct types and referencing the correct event and user.
 *
 * This test ensures the multi-actor business flow functions correctly and that
 * waitlist creation works with the appropriate role permissions and related
 * resources.
 *
 * Key DTOs used are IEventRegistrationAdmin, IEventRegistrationEventCategory,
 * IEventRegistrationEventOrganizer, IEventRegistrationEvent,
 * IEventRegistrationRegularUser, and IEventRegistrationEventWaitlist. Every API
 * response is validated using typia.assert to enforce strict TypeScript type
 * conformity and runtime structure validation.
 */
export async function test_api_eventwaitlist_create_success(
  connection: api.IConnection,
) {
  // 1. Create admin user and log in
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const adminUser: IEventRegistrationAdmin.IAuthorized =
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
  typia.assert(adminUser);

  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
    } satisfies IEventRegistrationAdmin.ILogin,
  });

  // 2. Create event category as admin
  const eventCategoryName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });
  const eventCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: {
          name: eventCategoryName,
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IEventRegistrationEventCategory.ICreate,
      },
    );
  typia.assert(eventCategory);

  // 3. Create event organizer user and authenticate
  const organizerEmail = typia.random<string & tags.Format<"email">>();
  const organizerPassword = RandomGenerator.alphaNumeric(12);

  const organizerUser: IEventRegistrationEventOrganizer.IAuthorized =
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
  typia.assert(organizerUser);

  await api.functional.auth.eventOrganizer.login(connection, {
    body: {
      email: organizerEmail,
      password_hash: organizerPassword,
    } satisfies IEventRegistrationEventOrganizer.ILogin,
  });

  // 4. Event organizer creates an event under the category
  const eventName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const eventDateISO = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 10,
  ).toISOString(); // 10 days from now
  const eventLocation = RandomGenerator.name(2);
  const eventCapacity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000>
  >() satisfies number as number;
  const eventTicketPrice = 0; // Free event for test

  const createdEvent: IEventRegistrationEvent =
    await api.functional.eventRegistration.eventOrganizer.events.create(
      connection,
      {
        body: {
          event_category_id: eventCategory.id,
          name: eventName,
          date: eventDateISO,
          location: eventLocation,
          capacity: eventCapacity,
          description: null,
          ticket_price: eventTicketPrice,
          status: "scheduled",
        } satisfies IEventRegistrationEvent.ICreate,
      },
    );
  typia.assert(createdEvent);

  // 5. Create regular user and authenticate
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

  await api.functional.auth.regularUser.login.loginRegularUser(connection, {
    body: {
      email: regularUserEmail,
      password_hash: regularUserPassword,
    } satisfies IEventRegistrationRegularUser.ILogin,
  });

  // 6. Switch back to event organizer authentication before creating waitlist entry
  await api.functional.auth.eventOrganizer.login(connection, {
    body: {
      email: organizerEmail,
      password_hash: organizerPassword,
    } satisfies IEventRegistrationEventOrganizer.ILogin,
  });

  // 7. Create the waitlist entry associating the regular user with the event
  const waitlistEntry: IEventRegistrationEventWaitlist =
    await api.functional.eventRegistration.eventOrganizer.eventWaitlists.create(
      connection,
      {
        body: {
          event_id: createdEvent.id,
          regular_user_id: regularUser.id,
        } satisfies IEventRegistrationEventWaitlist.ICreate,
      },
    );
  typia.assert(waitlistEntry);

  // 8. Verify correct associations
  TestValidator.equals(
    "Waitlist event_id matches created event id",
    waitlistEntry.event_id,
    createdEvent.id,
  );
  TestValidator.equals(
    "Waitlist regular_user_id matches created regular user id",
    waitlistEntry.regular_user_id,
    regularUser.id,
  );
}
