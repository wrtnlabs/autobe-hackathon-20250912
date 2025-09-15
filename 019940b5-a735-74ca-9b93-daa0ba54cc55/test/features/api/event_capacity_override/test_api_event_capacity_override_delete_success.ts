import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventCapacityOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCapacityOverride";

/**
 * This test verifies the successful deletion of an event capacity override
 * by an admin user.
 *
 * It performs the following steps:
 *
 * 1. Creates an admin user to authenticate requests.
 * 2. Creates an event as the context for capacity overrides.
 * 3. Creates an event capacity override linked to the event.
 * 4. Deletes the created capacity override by its unique identifier.
 * 5. Attempts deletion again to confirm the override has been removed,
 *    expecting an error.
 *
 * All API responses are asserted for type safety using typia. Business
 * logic assertions are done with TestValidator. This flow ensures capacity
 * override management works correctly for admin users.
 */
export async function test_api_event_capacity_override_delete_success(
  connection: api.IConnection,
) {
  // 1. Create admin user
  const adminInput = {
    email: `admin${Date.now()}@example.com`,
    password_hash: "hashed-password",
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminInput,
    });
  typia.assert(admin);

  // 2. Create event
  const eventInput = {
    event_category_id: typia.random<string & tags.Format<"uuid">>(),
    name: `Event ${RandomGenerator.name(2)}`,
    date: new Date(Date.now() + 86400000).toISOString(),
    location: RandomGenerator.name(3),
    capacity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
    description: null,
    ticket_price: 0,
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;

  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: eventInput,
    });
  typia.assert(event);

  // 3. Create event capacity override
  const capacityOverrideInput = {
    event_id: event.id,
    is_override_enabled: true,
  } satisfies IEventRegistrationEventCapacityOverride.ICreate;

  const capacityOverride: IEventRegistrationEventCapacityOverride =
    await api.functional.eventRegistration.admin.eventCapacityOverrides.createEventCapacityOverride(
      connection,
      {
        body: capacityOverrideInput,
      },
    );
  typia.assert(capacityOverride);

  // 4. Delete event capacity override by id
  await api.functional.eventRegistration.admin.events.capacityOverrides.eraseCapacityOverride(
    connection,
    {
      eventId: event.id,
      eventCapacityOverrideId: capacityOverride.id,
    },
  );

  // 5. Validate deletion by trying to delete it again and expecting an error
  await TestValidator.error(
    "should fail to delete capacity override twice",
    async () => {
      await api.functional.eventRegistration.admin.events.capacityOverrides.eraseCapacityOverride(
        connection,
        {
          eventId: event.id,
          eventCapacityOverrideId: capacityOverride.id,
        },
      );
    },
  );
}
