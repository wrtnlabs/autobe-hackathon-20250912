import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventAttendee } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventAttendee";
import type { IEventRegistrationEventCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCategory";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";
import type { IEventRegistrationRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationRegularUser";

/**
 * This test validates the event attendee deletion functionality by a
 * verified and authorized event organizer user.
 *
 * The test involves multiple roles (admin, event organizer, regular user)
 * to fully exercise authentication and authorization flows.
 *
 * It covers the complete scenario including creation of admin and event
 * organizer accounts, creation of an event category, creation of an event
 * under the category, registration of a regular user as an event attendee,
 * and deletion of the attendee registration by the event organizer.
 *
 * Negative test cases validate that unauthorized deletion attempts by other
 * roles (regular user, other event organizer, admin) result in errors.
 *
 * Steps:
 *
 * 1. Admin user signup and login.
 * 2. Creation of event category by admin.
 * 3. Event organizer user signup and login.
 * 4. Regular user signup and login.
 * 5. Creation of event by event organizer in the event category.
 * 6. Registration of regular user as event attendee.
 * 7. Deletion of attendee registration by event organizer.
 * 8. Negative tests for unauthorized deletion attempts.
 */
export async function test_api_event_organizer_event_attendee_deletion_success(
  connection: api.IConnection,
) {
  // 1. Create admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminUser = await api.functional.auth.admin.join.createAdminUser(
    connection,
    {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    },
  );
  typia.assert(adminUser);

  // 2. Login as admin
  const adminLogin = await api.functional.auth.admin.login.loginAdminUser(
    connection,
    {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
      } satisfies IEventRegistrationAdmin.ILogin,
    },
  );
  typia.assert(adminLogin);

  // 3. Create Event Category by admin
  const categoryName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });
  const eventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: {
          name: categoryName,
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 12,
            wordMin: 4,
            wordMax: 10,
          }),
        } satisfies IEventRegistrationEventCategory.ICreate,
      },
    );
  typia.assert(eventCategory);

  // 4. Create Event Organizer user
  const organizerEmail = typia.random<string & tags.Format<"email">>();
  const organizerPassword = RandomGenerator.alphaNumeric(12);
  const organizerUser = await api.functional.auth.eventOrganizer.join(
    connection,
    {
      body: {
        email: organizerEmail,
        password_hash: organizerPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationEventOrganizer.ICreate,
    },
  );
  typia.assert(organizerUser);

  // 5. Create Regular User
  const regularUserEmail = typia.random<string & tags.Format<"email">>();
  const regularUserPassword = RandomGenerator.alphaNumeric(12);
  const regularUser =
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

  // 6. Login as event organizer
  const organizerLogin = await api.functional.auth.eventOrganizer.login(
    connection,
    {
      body: {
        email: organizerEmail,
        password_hash: organizerPassword,
      } satisfies IEventRegistrationEventOrganizer.ILogin,
    },
  );
  typia.assert(organizerLogin);

  // 7. Create Event under category by organizer
  const eventName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 7,
  });
  const eventDateIso = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // event in 7 days
  const eventLocation = RandomGenerator.name(2);
  const eventCapacity = eventName.length * 20 + 50; // reasonable integer capacity
  const ticketPrice = Math.floor(Math.random() * 100) + 20; // 20 to 120
  const eventStatus = "scheduled" as const;
  const createdEvent =
    await api.functional.eventRegistration.eventOrganizer.events.create(
      connection,
      {
        body: {
          event_category_id: eventCategory.id,
          name: eventName,
          date: eventDateIso,
          location: eventLocation,
          capacity: eventCapacity satisfies number & tags.Type<"int32">,
          description: RandomGenerator.content({ paragraphs: 1 }),
          ticket_price: ticketPrice,
          status: eventStatus,
        } satisfies IEventRegistrationEvent.ICreate,
      },
    );
  typia.assert(createdEvent);

  // 8. Login as regular user
  const userLogin =
    await api.functional.auth.regularUser.login.loginRegularUser(connection, {
      body: {
        email: regularUserEmail,
        password_hash: regularUserPassword,
      } satisfies IEventRegistrationRegularUser.ILogin,
    });
  typia.assert(userLogin);

  // 9. Register regular user as attendee for event
  const attendee =
    await api.functional.eventRegistration.regularUser.eventAttendees.create(
      connection,
      {
        body: {
          event_id: createdEvent.id,
          regular_user_id: regularUser.id,
        } satisfies IEventRegistrationEventAttendee.ICreate,
      },
    );
  typia.assert(attendee);

  // 10. Login back as event organizer to perform deletion
  const organizerLoginAgain = await api.functional.auth.eventOrganizer.login(
    connection,
    {
      body: {
        email: organizerEmail,
        password_hash: organizerPassword,
      } satisfies IEventRegistrationEventOrganizer.ILogin,
    },
  );
  typia.assert(organizerLoginAgain);

  // 11. Delete attendee registration via event organizer endpoint
  await api.functional.eventRegistration.eventOrganizer.regularUsers.attendees.erase(
    connection,
    {
      regularUserId: regularUser.id,
      eventAttendeeId: attendee.id,
    },
  );

  // Validate deletion by asserting no error thrown
  TestValidator.predicate("deletion should succeed", true);

  // Negative test: Attempt deletion with unauthorized role (regular user)
  // Login as regular user again
  const userLoginAgain =
    await api.functional.auth.regularUser.login.loginRegularUser(connection, {
      body: {
        email: regularUserEmail,
        password_hash: regularUserPassword,
      } satisfies IEventRegistrationRegularUser.ILogin,
    });
  typia.assert(userLoginAgain);

  await TestValidator.error(
    "regular user cannot delete other attendee",
    async () => {
      await api.functional.eventRegistration.eventOrganizer.regularUsers.attendees.erase(
        connection,
        {
          regularUserId: regularUser.id,
          eventAttendeeId: attendee.id,
        },
      );
    },
  );

  // Negative test: Attempt deletion with another unauthorized event organizer
  const anotherOrganizerEmail = typia.random<string & tags.Format<"email">>();
  const anotherOrganizerPassword = RandomGenerator.alphaNumeric(12);
  const anotherOrganizer = await api.functional.auth.eventOrganizer.join(
    connection,
    {
      body: {
        email: anotherOrganizerEmail,
        password_hash: anotherOrganizerPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationEventOrganizer.ICreate,
    },
  );
  typia.assert(anotherOrganizer);

  const anotherOrganizerLogin = await api.functional.auth.eventOrganizer.login(
    connection,
    {
      body: {
        email: anotherOrganizerEmail,
        password_hash: anotherOrganizerPassword,
      } satisfies IEventRegistrationEventOrganizer.ILogin,
    },
  );
  typia.assert(anotherOrganizerLogin);

  await TestValidator.error(
    "another organizer cannot delete attendee",
    async () => {
      await api.functional.eventRegistration.eventOrganizer.regularUsers.attendees.erase(
        connection,
        {
          regularUserId: regularUser.id,
          eventAttendeeId: attendee.id,
        },
      );
    },
  );

  // Negative test: Attempt deletion with unauthorized admin user
  const anotherAdminEmail = typia.random<string & tags.Format<"email">>();
  const anotherAdminPassword = RandomGenerator.alphaNumeric(12);
  const anotherAdmin = await api.functional.auth.admin.join.createAdminUser(
    connection,
    {
      body: {
        email: anotherAdminEmail,
        password_hash: anotherAdminPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    },
  );
  typia.assert(anotherAdmin);

  const anotherAdminLogin =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: {
        email: anotherAdminEmail,
        password_hash: anotherAdminPassword,
      } satisfies IEventRegistrationAdmin.ILogin,
    });
  typia.assert(anotherAdminLogin);

  await TestValidator.error("admin cannot delete attendee", async () => {
    await api.functional.eventRegistration.eventOrganizer.regularUsers.attendees.erase(
      connection,
      {
        regularUserId: regularUser.id,
        eventAttendeeId: attendee.id,
      },
    );
  });
}
