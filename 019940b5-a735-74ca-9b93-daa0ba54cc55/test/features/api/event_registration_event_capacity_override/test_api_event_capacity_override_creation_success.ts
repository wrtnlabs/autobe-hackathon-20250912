import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEventCapacityOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCapacityOverride";

/**
 * Test the successful creation of an event capacity override with admin
 * authorization.
 *
 * This test performs the following steps:
 *
 * 1. Creates an admin user by calling the admin user join creation endpoint, which
 *    also establishes the auth token.
 * 2. Using the authenticated context, creates an event capacity override record
 *    with a realistic event_id and is_override_enabled set to true.
 * 3. Validates the API response to ensure the override record is returned with
 *    expected properties and the override flag set.
 * 4. Ensures that typia.assert passes on both responses for full type validation.
 * 5. Covers the happy path success scenario for the admin role interacting with
 *    capacity override management.
 */
export async function test_api_event_capacity_override_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1. Create admin user and establish authentication context
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
    full_name: RandomGenerator.name(),
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminUser);

  // Step 2. Create event capacity override with realistic event_id
  const overrideCreateBody = {
    event_id: typia.random<string & tags.Format<"uuid">>(),
    is_override_enabled: true,
  } satisfies IEventRegistrationEventCapacityOverride.ICreate;

  const override: IEventRegistrationEventCapacityOverride =
    await api.functional.eventRegistration.admin.eventCapacityOverrides.createEventCapacityOverride(
      connection,
      { body: overrideCreateBody },
    );
  typia.assert(override);

  // Step 3. Validate the override record fields
  TestValidator.equals(
    "override event_id matches input",
    override.event_id,
    overrideCreateBody.event_id,
  );
  TestValidator.predicate(
    "override is_override_enabled is true",
    override.is_override_enabled === true,
  );
}
