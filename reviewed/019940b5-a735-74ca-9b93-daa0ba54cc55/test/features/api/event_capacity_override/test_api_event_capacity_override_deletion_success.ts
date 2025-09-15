import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEventCapacityOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCapacityOverride";

/**
 * This E2E test function validates the deletion of an event capacity
 * override by an admin user.
 *
 * It tests the full flow of admin authentication, creation of a capacity
 * override, and the successful deletion of the override using the dedicated
 * API endpoint.
 *
 * Steps:
 *
 * 1. Admin user account creation via join API with required profile and
 *    credentials.
 * 2. Creation of an event capacity override entry specifying the event and
 *    override flag.
 * 3. Authentication context established with the admin user credentials.
 * 4. Deletion of the created event capacity override by its UUID to disable
 *    manual override.
 * 5. Confirmation of deletion operation success (no content returned).
 *
 * The test ensures that only properly authenticated admins can manage event
 * capacity overrides, and validates request and response DTOs accurately.
 */
export async function test_api_event_capacity_override_deletion_success(
  connection: api.IConnection,
) {
  // 1. Create admin user and authenticate
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
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

  // 2. Create event capacity override record
  const overrideCreateBody = {
    event_id: typia.random<string & tags.Format<"uuid">>(),
    is_override_enabled: true,
  } satisfies IEventRegistrationEventCapacityOverride.ICreate;

  const overrideResponse: IEventRegistrationEventCapacityOverride =
    await api.functional.eventRegistration.admin.eventCapacityOverrides.createEventCapacityOverride(
      connection,
      {
        body: overrideCreateBody,
      },
    );
  typia.assert(overrideResponse);

  // 3. Delete the created event capacity override by its ID
  await api.functional.eventRegistration.admin.eventCapacityOverrides.erase(
    connection,
    {
      eventCapacityOverrideId: overrideResponse.id,
    },
  );
}
