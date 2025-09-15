import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventCapacityOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCapacityOverride";
import type { IEventRegistrationEventCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCategory";

/**
 * Test retrieving detailed event capacity override record by ID as an
 * admin.
 *
 * This test verifies the entire workflow for an admin user to:
 *
 * 1. Create and authenticate an admin user.
 * 2. Create an event category.
 * 3. Create an event linked to the category.
 * 4. Create an event capacity override for the event.
 * 5. Retrieve the capacity override by its ID and validate the data
 *    correctness and authorization.
 *
 * This ensures that the admin role authorization is properly enforced and
 * that detailed capacity override information can be retrieved
 * successfully.
 */
export async function test_api_event_capacity_override_retrieve_by_admin(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();

  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: "hashed_password_1234",
        full_name: RandomGenerator.name(),
        phone_number: null,
        profile_picture_url: null,
        email_verified: true,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create event category
  const eventCategoryCreateBody = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IEventRegistrationEventCategory.ICreate;

  const eventCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      { body: eventCategoryCreateBody },
    );
  typia.assert(eventCategory);

  // 3. Create event linked to category
  const nowISOString = new Date().toISOString();

  const eventCreateBody = {
    event_category_id: eventCategory.id,
    name: RandomGenerator.name(3),
    date: nowISOString,
    location: RandomGenerator.name(2),
    capacity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    ticket_price: 0,
    status: "scheduled" as const,
  } satisfies IEventRegistrationEvent.ICreate;

  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: eventCreateBody,
    });
  typia.assert(event);

  // 4. Create event capacity override record
  const capacityOverrideCreateBody = {
    event_id: event.id,
    is_override_enabled: true,
  } satisfies IEventRegistrationEventCapacityOverride.ICreate;

  const capacityOverride: IEventRegistrationEventCapacityOverride =
    await api.functional.eventRegistration.admin.eventCapacityOverrides.createEventCapacityOverride(
      connection,
      { body: capacityOverrideCreateBody },
    );
  typia.assert(capacityOverride);

  // 5. Retrieve the capacity override by ID
  const retrievedCapacityOverride: IEventRegistrationEventCapacityOverride =
    await api.functional.eventRegistration.admin.eventCapacityOverrides.atEventCapacityOverride(
      connection,
      { eventCapacityOverrideId: capacityOverride.id },
    );
  typia.assert(retrievedCapacityOverride);

  // Validate business logic
  TestValidator.equals(
    "Retrieved capacity override ID matches created ID",
    retrievedCapacityOverride.id,
    capacityOverride.id,
  );
  TestValidator.equals(
    "Retrieved capacity override event_id matches created event_id",
    retrievedCapacityOverride.event_id,
    capacityOverride.event_id,
  );
  TestValidator.equals(
    "Retrieved capacity override is_override_enabled matches",
    retrievedCapacityOverride.is_override_enabled,
    capacityOverride.is_override_enabled,
  );
}
