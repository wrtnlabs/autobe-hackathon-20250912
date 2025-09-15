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
 * This test function verifies the successful update of an event waitlist entry
 * by an event organizer. It adopts a multi-actor scenario where the admin
 * creates an event category, the event organizer creates an event linked to
 * this category, and a regular user is added to the event waitlist by the event
 * organizer. Then, the event organizer updates certain attributes of this
 * waitlist entry. The test ensures proper authentication for each user role,
 * stable creation of required entities, and finally verifies that the update of
 * the waitlist entry is successful as per the API's contract and scenario
 * requirements.
 */
export async function test_api_event_waitlist_update_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin user
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

  // 2. Admin login
  const adminLoggedIn: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
      } satisfies IEventRegistrationAdmin.ILogin,
    });
  typia.assert(adminLoggedIn);

  // 3. Use admin session to create event category
  const categoryName = RandomGenerator.name();
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

  // 4. Create and authenticate event organizer user
  const organizerEmail = typia.random<string & tags.Format<"email">>();
  const organizerPassword = RandomGenerator.alphaNumeric(12);
  const organizer: IEventRegistrationEventOrganizer.IAuthorized =
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
  typia.assert(organizer);

  // 5. Organizer login
  const organizerLoggedIn: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.login(connection, {
      body: {
        email: organizerEmail,
        password_hash: organizerPassword,
      } satisfies IEventRegistrationEventOrganizer.ILogin,
    });
  typia.assert(organizerLoggedIn);

  // 6. Create event by event organizer
  // Use the previously created categoryId
  const eventName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const eventDateISOString = new Date(Date.now() + 86400000).toISOString(); // +1 day
  const eventCapacity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >() satisfies number as number;
  const eventLocation = RandomGenerator.name(2);
  const ticketPrice = Math.floor(Math.random() * 10000) / 100; // realistic ticket price
  const eventStatus = "scheduled" as const;

  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.eventOrganizer.events.create(
      connection,
      {
        body: {
          event_category_id: eventCategory.id,
          name: eventName,
          date: eventDateISOString,
          location: eventLocation,
          capacity: eventCapacity,
          description: null,
          ticket_price: ticketPrice,
          status: eventStatus,
        } satisfies IEventRegistrationEvent.ICreate,
      },
    );
  typia.assert(event);

  // 7. Create and authenticate regular user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const regularUser: IEventRegistrationRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join.joinRegularUser(connection, {
      body: {
        email: userEmail,
        password_hash: userPassword,
        full_name: RandomGenerator.name(),
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationRegularUser.ICreate,
    });
  typia.assert(regularUser);

  // 8. Event organizer adds regular user to the event waitlist
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

  // 9. Update the waitlist entry by event organizer with new values
  const updatedCreatedAt = new Date(Date.now() + 172800000).toISOString(); // +2 days
  const updatedWaitlist: IEventRegistrationEventWaitlist =
    await api.functional.eventRegistration.eventOrganizer.events.waitlists.update(
      connection,
      {
        eventId: event.id,
        eventWaitlistId: waitlistEntry.id,
        body: {
          event_id: null,
          regular_user_id: null,
          created_at: updatedCreatedAt,
          updated_at: new Date().toISOString(),
        } satisfies IEventRegistrationEventWaitlist.IUpdate,
      },
    );
  typia.assert(updatedWaitlist);

  // 10. Validate that the updated waitlist entry matches the API response
  TestValidator.equals(
    "Waitlist ID should remain the same after update",
    updatedWaitlist.id,
    waitlistEntry.id,
  );
  TestValidator.equals(
    "Waitlist eventId should match provided event id",
    updatedWaitlist.event_id,
    waitlistEntry.event_id,
  );
  TestValidator.equals(
    "Waitlist regularUserId should match provided user id",
    updatedWaitlist.regular_user_id,
    waitlistEntry.regular_user_id,
  );
  TestValidator.predicate(
    "created_at timestamp updated successfully",
    updatedWaitlist.created_at === updatedCreatedAt,
  );
  TestValidator.predicate(
    "updated_at timestamp updated successfully",
    Boolean(updatedWaitlist.updated_at),
  );
}
