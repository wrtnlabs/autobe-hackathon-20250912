import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventCapacityOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCapacityOverride";
import type { IEventRegistrationEventCapacityOverrides } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCapacityOverrides";

/**
 * Test for successful retrieval of an event capacity override record.
 *
 * This test covers the complete flow:
 *
 * 1. Admin user creation and authentication.
 * 2. Event creation.
 * 3. Event capacity override creation linked to the event.
 * 4. Retrieval of the capacity override by its ID.
 *
 * Assertions validate the successful creation of entities and verify that
 * the retrieved capacity override matches the created data in all crucial
 * fields.
 */
export async function test_api_event_capacity_override_retrieve_success(
  connection: api.IConnection,
) {
  // 1. Create admin user and authenticate
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash: string = RandomGenerator.alphaNumeric(64);
  const adminFullName: string = RandomGenerator.name();
  const adminCreateBody = {
    email: adminEmail,
    password_hash: adminPasswordHash,
    full_name: adminFullName,
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
    name: RandomGenerator.name(),
    date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    location: RandomGenerator.name(),
    capacity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    description: null,
    ticket_price: typia.random<number>(),
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;

  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: eventCreateBody,
    });
  typia.assert(event);

  // 3. Create event capacity override linked to the event
  const overrideCreateBody = {
    event_id: event.id,
    is_override_enabled: true,
  } satisfies IEventRegistrationEventCapacityOverride.ICreate;

  const override: IEventRegistrationEventCapacityOverride =
    await api.functional.eventRegistration.admin.eventCapacityOverrides.createEventCapacityOverride(
      connection,
      {
        body: overrideCreateBody,
      },
    );
  typia.assert(override);

  // 4. Retrieve the capacity override by eventId and overrideId
  const retrievedOverride: IEventRegistrationEventCapacityOverrides =
    await api.functional.eventRegistration.admin.events.capacityOverrides.at(
      connection,
      {
        eventId: event.id,
        eventCapacityOverrideId: override.id,
      },
    );
  typia.assert(retrievedOverride);

  // Validate retrieved properties match created ones
  TestValidator.equals("event IDs match", retrievedOverride.event_id, event.id);
  TestValidator.equals(
    "override enablement flag matches",
    retrievedOverride.is_override_enabled,
    override.is_override_enabled,
  );
  TestValidator.equals(
    "created_at timestamps match",
    retrievedOverride.created_at,
    override.created_at,
  );
  TestValidator.equals(
    "updated_at timestamps match",
    retrievedOverride.updated_at,
    override.updated_at,
  );
}
