import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCategory";

export async function test_api_event_delete_successful_admin_context(
  connection: api.IConnection,
) {
  // 1. Create an admin user to authenticate for admin context
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: RandomGenerator.alphaNumeric(32), // hashed password simulation
        full_name: RandomGenerator.name(),
        phone_number: null, // optional null
        profile_picture_url: null, // optional null
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(adminUser);

  // 2. Create an event category to classify the event
  const eventCategoryName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
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
            sentenceMin: 3,
            sentenceMax: 6,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IEventRegistrationEventCategory.ICreate,
      },
    );
  typia.assert(eventCategory);

  // 3. Create an event associated with the event category
  const eventName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 10,
  });
  const eventDate = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(); // 7 days from now
  const eventLocation = RandomGenerator.name(2);
  const capacity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >() satisfies number as number;
  const safeCapacity = capacity < 1 ? 10 : capacity; // ensure positive capacity
  const ticketPrice = Math.floor(Math.random() * 5000); // ticket price between 0 and 4999

  const eventCreated: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: {
        event_category_id: eventCategory.id,
        name: eventName,
        date: eventDate,
        location: eventLocation,
        capacity: safeCapacity,
        description: RandomGenerator.content({ paragraphs: 1 }),
        ticket_price: ticketPrice,
        status: "scheduled",
      } satisfies IEventRegistrationEvent.ICreate,
    });
  typia.assert(eventCreated);

  TestValidator.predicate(
    "event status is scheduled",
    eventCreated.status === "scheduled",
  );

  // 4. Delete the created event by eventId
  await api.functional.eventRegistration.admin.events.erase(connection, {
    eventId: eventCreated.id,
  });

  // No response to validate on delete, but we assert no exceptions and correct flow
  // Additional test for deleting non-existent event or unauthorized user would be in separate test functions
}
