import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventCapacityOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCapacityOverride";

/**
 * Test successful creation of event capacity override by admin.
 *
 * This test validates the workflow where an admin user, after being created,
 * creates an event, and then creates a capacity override for that event.
 *
 * The test ensures that the capacity override has the override flag set
 * correctly and includes valid creation and update timestamps.
 *
 * Steps:
 *
 * 1. Create admin user with valid credentials.
 * 2. Create an event under the admin context with realistic and valid data.
 * 3. Create a capacity override for that event with `is_override_enabled` true.
 * 4. Validate responses for type and business logic correctness.
 */
export async function test_api_event_capacity_override_create_success(
  connection: api.IConnection,
) {
  // 1. Create admin user
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    full_name: RandomGenerator.name(2),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;
  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Create an event
  const eventCreateBody = {
    event_category_id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(3),
    date: new Date(Date.now() + 86400000).toISOString(),
    location: RandomGenerator.paragraph({ sentences: 3 }),
    capacity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
    description: null,
    ticket_price: 0,
    status: "scheduled", // Only exact allowed status
  } satisfies IEventRegistrationEvent.ICreate;
  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: eventCreateBody,
    });
  typia.assert(event);

  // 3. Create capacity override for the event
  const overrideCreateBody = {
    event_id: event.id,
    is_override_enabled: true,
  } satisfies IEventRegistrationEventCapacityOverride.ICreate;
  const capacityOverride: IEventRegistrationEventCapacityOverride =
    await api.functional.eventRegistration.admin.events.capacityOverrides.createCapacityOverride(
      connection,
      {
        eventId: event.id,
        body: overrideCreateBody,
      },
    );
  typia.assert(capacityOverride);

  // 4. Business validations
  TestValidator.equals(
    "capacityOverride.event_id should match created event id",
    capacityOverride.event_id,
    event.id,
  );
  TestValidator.predicate(
    "capacityOverride.is_override_enabled should be true",
    capacityOverride.is_override_enabled === true,
  );

  // Verify valid ISO date-time strings for created_at and updated_at
  const isoDateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  TestValidator.predicate(
    "capacityOverride.created_at should be ISO 8601 date-time",
    isoDateTimeRegex.test(capacityOverride.created_at),
  );
  TestValidator.predicate(
    "capacityOverride.updated_at should be ISO 8601 date-time",
    isoDateTimeRegex.test(capacityOverride.updated_at),
  );
}
