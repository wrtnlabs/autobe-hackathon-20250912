import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCategory";

/**
 * E2E test for admin event update endpoint.
 *
 * This test validates a successful update of an event by an admin user. It
 * verifies that the admin can create a user account, create a category, create
 * an event, then update the event with modified details.
 *
 * Business Context:
 *
 * - Admin users have authority to create categories and events.
 * - Events must belong to a category.
 * - Events have required fields such as name, date, location, capacity,
 *   ticket_price, and status.
 * - Updates allow modifying any of these fields with valid data.
 *
 * Test Steps:
 *
 * 1. Create an admin user via /auth/admin/join.
 * 2. Create an event category with a unique name.
 * 3. Create an event using the category's ID with valid details.
 * 4. Update the event with a set of new values.
 * 5. Assert that the updated event data matches the new values.
 */
export async function test_api_event_update_successful_admin_context(
  connection: api.IConnection,
) {
  // 1. Create admin user and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(32);
  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: passwordHash,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create event category
  const categoryName = RandomGenerator.name(2);
  const categoryDescription = RandomGenerator.paragraph({ sentences: 8 });
  const category: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: {
          name: categoryName,
          description: categoryDescription,
        } satisfies IEventRegistrationEventCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create event
  const today = new Date();
  const eventDateISOString = new Date(
    today.getTime() + 86400000 * 10,
  ).toISOString(); // 10 days from now
  const eventCreateBody = {
    event_category_id: category.id,
    name: RandomGenerator.name(3),
    date: eventDateISOString,
    location: RandomGenerator.paragraph({ sentences: 2 }),
    capacity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    description: RandomGenerator.content({ paragraphs: 2 }),
    ticket_price: Math.floor(Math.random() * 5000),
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;

  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: eventCreateBody,
    });
  typia.assert(event);

  // 4. Update event with new values
  const updatedEventDateISOString = new Date(
    today.getTime() + 86400000 * 20,
  ).toISOString(); // 20 days from now
  const eventUpdateBody = {
    event_category_id: category.id,
    name: RandomGenerator.name(4),
    date: updatedEventDateISOString,
    location: RandomGenerator.name(3),
    capacity: 1000,
    description: RandomGenerator.content({ paragraphs: 3 }),
    ticket_price: 1500,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.IUpdate;

  const updatedEvent: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.update(connection, {
      eventId: event.id,
      body: eventUpdateBody,
    });
  typia.assert(updatedEvent);

  // 5. Assert updated event data matches update input
  TestValidator.equals(
    "event update: category ID",
    updatedEvent.event_category_id,
    eventUpdateBody.event_category_id,
  );
  TestValidator.equals(
    "event update: name",
    updatedEvent.name,
    eventUpdateBody.name,
  );
  TestValidator.equals(
    "event update: date",
    updatedEvent.date,
    eventUpdateBody.date,
  );
  TestValidator.equals(
    "event update: location",
    updatedEvent.location,
    eventUpdateBody.location,
  );
  TestValidator.equals(
    "event update: capacity",
    updatedEvent.capacity,
    eventUpdateBody.capacity,
  );
  TestValidator.equals(
    "event update: description",
    updatedEvent.description,
    eventUpdateBody.description,
  );
  TestValidator.equals(
    "event update: ticket price",
    updatedEvent.ticket_price,
    eventUpdateBody.ticket_price,
  );
  TestValidator.equals(
    "event update: status",
    updatedEvent.status,
    eventUpdateBody.status,
  );
}
