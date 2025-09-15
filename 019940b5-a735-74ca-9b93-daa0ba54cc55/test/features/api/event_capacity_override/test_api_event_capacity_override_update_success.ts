import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventCapacityOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCapacityOverride";

export async function test_api_event_capacity_override_update_success(
  connection: api.IConnection,
) {
  // 1. Create an admin user
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    full_name: RandomGenerator.name(),
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
    date: new Date(Date.now() + 86400000).toISOString(), // one day in the future
    location: RandomGenerator.name(1),
    capacity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    description: null,
    ticket_price: 100,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;

  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: eventCreateBody,
    });
  typia.assert(event);

  // 3. Create a event capacity override
  const capacityOverrideCreateBody = {
    event_id: event.id,
    is_override_enabled: false,
  } satisfies IEventRegistrationEventCapacityOverride.ICreate;

  const capacityOverride: IEventRegistrationEventCapacityOverride =
    await api.functional.eventRegistration.admin.eventCapacityOverrides.createEventCapacityOverride(
      connection,
      { body: capacityOverrideCreateBody },
    );
  typia.assert(capacityOverride);

  // 4. Update capacity override is_override_enabled flag to true
  const updateBody = {
    is_override_enabled: true,
  } satisfies IEventRegistrationEventCapacityOverride.IUpdate;

  const updatedCapacityOverride: IEventRegistrationEventCapacityOverride =
    await api.functional.eventRegistration.admin.events.capacityOverrides.updateCapacityOverride(
      connection,
      {
        eventId: event.id,
        eventCapacityOverrideId: capacityOverride.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCapacityOverride);

  // 5. Validate values
  TestValidator.equals(
    "updated eventId matches",
    updatedCapacityOverride.event_id,
    event.id,
  );
  TestValidator.equals(
    "updated override id matches",
    updatedCapacityOverride.id,
    capacityOverride.id,
  );
  TestValidator.equals(
    "override flag is enabled",
    updatedCapacityOverride.is_override_enabled,
    true,
  );
}
