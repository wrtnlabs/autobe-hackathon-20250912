import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEvent";
import type { IEventRegistrationEventCapacityOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCapacityOverride";
import type { IEventRegistrationEventCapacityOverrides } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCapacityOverrides";
import type { IEventRegistrationEventCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCategory";

/**
 * Test updating existing event capacity override by an admin user.
 *
 * This test covers the successful modification of the is_override_enabled
 * flag of an event capacity override entry. It includes creating an admin
 * user, authenticating, creating an event category, an event, a capacity
 * override entry, and then updating the override flag. Validations confirm
 * the update occurred correctly.
 *
 * Steps:
 *
 * 1. Create admin user with join endpoint
 * 2. Login as admin
 * 3. Create event category
 * 4. Create event linked to the category
 * 5. Create event capacity override linked to the event
 * 6. Update the is_override_enabled flag in the capacity override
 * 7. Assert updated fields match expectations
 */
export async function test_api_admin_event_capacity_override_update_success(
  connection: api.IConnection,
) {
  // Step 1: Create admin user
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "safe_hashed_password",
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const adminAuthorized: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // Step 2: Admin login
  const loginBody = {
    email: adminCreateBody.email,
    password_hash: adminCreateBody.password_hash,
  } satisfies IEventRegistrationAdmin.ILogin;

  const adminLoginAuthorized: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.login.loginAdminUser(connection, {
      body: loginBody,
    });
  typia.assert(adminLoginAuthorized);

  // Step 3: Create event category
  const eventCategoryBody = {
    name: RandomGenerator.name(),
    description: null,
  } satisfies IEventRegistrationEventCategory.ICreate;

  const eventCategory: IEventRegistrationEventCategory =
    await api.functional.eventRegistration.admin.eventCategories.create(
      connection,
      {
        body: eventCategoryBody,
      },
    );
  typia.assert(eventCategory);

  // Step 4: Create event
  const eventBody = {
    event_category_id: eventCategory.id,
    name: RandomGenerator.name(),
    date: new Date(Date.now() + 86400000).toISOString(),
    location: RandomGenerator.name(),
    capacity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    description: null,
    ticket_price: typia.random<number>(),
    status: "scheduled",
  } satisfies IEventRegistrationEvent.ICreate;

  const event: IEventRegistrationEvent =
    await api.functional.eventRegistration.admin.events.create(connection, {
      body: eventBody,
    });
  typia.assert(event);

  // Step 5: Create capacity override
  const capacityOverrideBody = {
    event_id: event.id,
    is_override_enabled: true,
  } satisfies IEventRegistrationEventCapacityOverride.ICreate;

  const capacityOverride: IEventRegistrationEventCapacityOverride =
    await api.functional.eventRegistration.admin.eventCapacityOverrides.createEventCapacityOverride(
      connection,
      {
        body: capacityOverrideBody,
      },
    );
  typia.assert(capacityOverride);

  // Step 6: Update override's is_override_enabled flag
  const updateBody = {
    is_override_enabled: !capacityOverride.is_override_enabled,
  } satisfies IEventRegistrationEventCapacityOverrides.IUpdate;

  const updatedCapacityOverride: IEventRegistrationEventCapacityOverrides =
    await api.functional.eventRegistration.admin.eventCapacityOverrides.update(
      connection,
      {
        eventCapacityOverrideId: capacityOverride.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCapacityOverride);

  // Step 7: Validate results
  TestValidator.equals(
    "id matches capacity override ID",
    updatedCapacityOverride.id,
    capacityOverride.id,
  );
  TestValidator.equals(
    "event_id matches event id",
    updatedCapacityOverride.event_id,
    event.id,
  );
  TestValidator.equals(
    "is_override_enabled is updated",
    updatedCapacityOverride.is_override_enabled,
    updateBody.is_override_enabled,
  );
}
