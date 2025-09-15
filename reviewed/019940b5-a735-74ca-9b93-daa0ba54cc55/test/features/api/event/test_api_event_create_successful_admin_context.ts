import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";

/**
 * Validate that an admin user can successfully create a new event.
 *
 * This test covers the full positive flow:
 *
 * 1. Admin user creation with required credentials and authorization token
 *    acquisition.
 * 2. Construction of a valid event payload meeting all DTO schema
 *    requirements.
 * 3. Event creation call to the API endpoint with authenticated admin context.
 * 4. Validation that the response accurately reflects the event data sent and
 *    includes correct timestamps.
 *
 * The test ensures strict type safety, uses fully compliant data formats,
 * and confirms the business logic of event creation by an authorized
 * admin.
 */
export async function test_api_event_create_successful_admin_context(
  connection: api.IConnection,
) {
  // 1. Create an admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash: string = RandomGenerator.alphaNumeric(32);
  const adminFullName: string = RandomGenerator.name();
  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
        full_name: adminFullName,
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(adminUser);

  // 2. Prepare event creation payload
  const eventCategoryId: string = typia.random<string & tags.Format<"uuid">>();
  const eventName: string = RandomGenerator.name(3);
  const eventDate: string = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days in future
  const eventLocation: string = RandomGenerator.name(4);
  const eventCapacity: number & tags.Type<"int32"> = 100;
  const eventDescription: string | null = null;
  const eventTicketPrice: number = 5000;
  const eventStatus: "scheduled" | "cancelled" | "completed" = "scheduled";

  const createdEvent: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: {
        event_category_id: eventCategoryId,
        name: eventName,
        date: eventDate,
        location: eventLocation,
        capacity: eventCapacity,
        description: eventDescription,
        ticket_price: eventTicketPrice,
        status: eventStatus,
      } satisfies IEventRegistrationEvent.ICreate,
    });
  typia.assert(createdEvent);

  // 3. Validate response values match request
  TestValidator.equals(
    "event_category_id matches",
    createdEvent.event_category_id,
    eventCategoryId,
  );
  TestValidator.equals("name matches", createdEvent.name, eventName);
  TestValidator.equals("date matches", createdEvent.date, eventDate);
  TestValidator.equals(
    "location matches",
    createdEvent.location,
    eventLocation,
  );
  TestValidator.equals(
    "capacity matches",
    createdEvent.capacity,
    eventCapacity,
  );
  TestValidator.equals(
    "description matches",
    createdEvent.description,
    eventDescription,
  );
  TestValidator.equals(
    "ticket_price matches",
    createdEvent.ticket_price,
    eventTicketPrice,
  );
  TestValidator.equals("status matches", createdEvent.status, eventStatus);

  typia.assert<string & tags.Format<"date-time">>(createdEvent.created_at);
  typia.assert<string & tags.Format<"date-time">>(createdEvent.updated_at);
  // deleted_at is optional and not checked here
}
