import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCategory";
import type { IEventRegistrationEventOrganizer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventOrganizer";

export async function test_api_event_update_successful_eventorganizer_context(
  connection: api.IConnection,
) {
  // 1. Create admin user (admin join)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass1234";
  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      },
    });
  typia.assert(admin);

  // 2. Admin authentication (admin login)
  await api.functional.auth.admin.login.loginAdminUser(connection, {
    body: {
      email: adminEmail,
      password_hash: adminPassword,
    },
  });

  // 3. Create event category by admin
  const eventCategoryName = RandomGenerator.name(1);
  const eventCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: {
          name: eventCategoryName,
          description: `Category for ${eventCategoryName} events`,
        },
      },
    );
  typia.assert(eventCategory);

  // 4. Create EventOrganizer user (event organizer join)
  const eventOrganizerEmail = typia.random<string & tags.Format<"email">>();
  const eventOrganizerPassword = "OrgPass1234";
  const eventOrganizer: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: {
        email: eventOrganizerEmail,
        password_hash: eventOrganizerPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      },
    });
  typia.assert(eventOrganizer);

  // 5. Create event by event organizer
  const eventName = RandomGenerator.name(3);
  const eventDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days later
  const eventLocation = `${RandomGenerator.name(1)} Convention Center`;
  const eventCapacity = 200;
  const eventDescription = RandomGenerator.paragraph({ sentences: 5 });
  const eventTicketPrice = 150;
  const eventStatus = "scheduled" as const;

  const originalEvent: IEventRegistrationEvent =
    await api.functional.eventRegistration.eventOrganizer.events.create(
      connection,
      {
        body: {
          event_category_id: eventCategory.id,
          name: eventName,
          date: eventDate,
          location: eventLocation,
          capacity: eventCapacity,
          description: eventDescription,
          ticket_price: eventTicketPrice,
          status: eventStatus,
        },
      },
    );
  typia.assert(originalEvent);

  // 6. Update event by event organizer (update event info)
  const updatedEventName = `${eventName} Updated`;
  const updatedEventDate = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 14 days later
  const updatedEventLocation = `${RandomGenerator.name(1)} Exhibition Hall`;
  const updatedEventCapacity = 250;
  const updatedEventDescription = RandomGenerator.paragraph({ sentences: 7 });
  const updatedEventTicketPrice = 180;
  const updatedEventStatus = "scheduled" as const;

  const updatedEvent: IEventRegistrationEvent =
    await api.functional.eventRegistration.eventOrganizer.events.update(
      connection,
      {
        eventId: originalEvent.id,
        body: {
          event_category_id: eventCategory.id,
          name: updatedEventName,
          date: updatedEventDate,
          location: updatedEventLocation,
          capacity: updatedEventCapacity,
          description: updatedEventDescription,
          ticket_price: updatedEventTicketPrice,
          status: updatedEventStatus,
        },
      },
    );
  typia.assert(updatedEvent);

  TestValidator.equals(
    "event id unchanged on update",
    updatedEvent.id,
    originalEvent.id,
  );
  TestValidator.equals(
    "event name updated",
    updatedEvent.name,
    updatedEventName,
  );
  TestValidator.equals(
    "event date updated",
    updatedEvent.date,
    updatedEventDate,
  );
  TestValidator.equals(
    "event location updated",
    updatedEvent.location,
    updatedEventLocation,
  );
  TestValidator.equals(
    "event capacity updated",
    updatedEvent.capacity,
    updatedEventCapacity,
  );
  TestValidator.equals(
    "event description updated",
    updatedEvent.description ?? null,
    updatedEventDescription,
  );
  TestValidator.equals(
    "event ticket price updated",
    updatedEvent.ticket_price,
    updatedEventTicketPrice,
  );
  TestValidator.equals(
    "event status updated",
    updatedEvent.status,
    updatedEventStatus,
  );

  // 7. Attempt to update event unauthorized by a different event organizer (should fail)
  const otherEventOrganizerEmail = typia.random<
    string & tags.Format<"email">
  >();
  const otherEventOrganizerPassword = "OtherOrgPass1234";
  const otherEventOrganizer: IEventRegistrationEventOrganizer.IAuthorized =
    await api.functional.auth.eventOrganizer.join(connection, {
      body: {
        email: otherEventOrganizerEmail,
        password_hash: otherEventOrganizerPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      },
    });
  typia.assert(otherEventOrganizer);

  await api.functional.auth.eventOrganizer.login(connection, {
    body: {
      email: otherEventOrganizerEmail,
      password_hash: otherEventOrganizerPassword,
    },
  });

  await TestValidator.error(
    "unexpected update by unauthorized event organizer should fail",
    async () => {
      await api.functional.eventRegistration.eventOrganizer.events.update(
        connection,
        {
          eventId: originalEvent.id,
          body: {
            name: "Hacker Attempt",
            date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
            location: "Unknown Location",
            capacity: 10,
            description: "Malicious update",
            ticket_price: 999,
            status: "cancelled",
          },
        },
      );
    },
  );

  // 8. Attempt to update event with invalid values (negative capacity) by authorized event organizer (should fail)
  await api.functional.auth.eventOrganizer.login(connection, {
    body: {
      email: eventOrganizerEmail,
      password_hash: eventOrganizerPassword,
    },
  });

  await TestValidator.error(
    "updating event with invalid capacity (negative) should fail",
    async () => {
      await api.functional.eventRegistration.eventOrganizer.events.update(
        connection,
        {
          eventId: originalEvent.id,
          body: {
            capacity: -100,
          },
        },
      );
    },
  );
}
