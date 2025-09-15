import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEventCapacityOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCapacityOverride";
import type { IEventRegistrationEventCapacityOverrides } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCapacityOverrides";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationEventCapacityOverrides } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventCapacityOverrides";

/**
 * This E2E test validates the ability of an admin user to list event
 * capacity override records for a specific event via the paginated API
 * endpoint PATCH
 * /eventRegistration/admin/events/{eventId}/capacityOverrides.
 *
 * The test performs the full flow:
 *
 * 1. Create an admin user account using the /auth/admin/join endpoint.
 * 2. Use the admin user to create a new event capacity override record linked
 *    to a generated event ID with the
 *    /eventRegistration/admin/eventCapacityOverrides endpoint.
 * 3. Call the main scenario PATCH
 *    /eventRegistration/admin/events/{eventId}/capacityOverrides to
 *    retrieve the paginated list of capacity overrides for the event.
 *
 * The test checks for typia type assertion on all returned responses and
 * uses TestValidator functions to assert meaningful properties to validate
 * the data integrity:
 *
 * - Admin creation response must be typed and token present.
 * - Created capacity override must be typed and associated with the generated
 *   event ID.
 * - The paginated capacity override index response must be typed correctly.
 *
 * This simulates an admin managing event capacity override settings by
 * viewing overrides via a paginated API.
 *
 * Detailed Steps:
 *
 * - Admin joins via /auth/admin/join supplying realistic email,
 *   password_hash, full_name, and nullable phone_number and
 *   profile_picture_url set to null explicitly, with email_verified set to
 *   true.
 * - A random UUID is generated for event_id (using typia.random<string &
 *   tags.Format<"uuid">>()) to be used for capacity override creation.
 * - Admin creates an event capacity override record with this event_id and
 *   is_override_enabled set randomly to true or false to cover both
 *   override states.
 * - Admin then calls the PATCH list API for capacity overrides with eventId
 *   parameter set to the used event_id.
 * - The paginated listing is asserted to have at least one entry, and the
 *   entry matches the created override.
 *
 * All typings, including IEventRegistrationAdmin.ICreate,
 * IEventRegistrationAdmin.IAuthorized,
 * IEventRegistrationEventCapacityOverride.ICreate,
 * IEventRegistrationEventCapacityOverride,
 * IPageIEventRegistrationEventCapacityOverrides, and
 * IEventRegistrationEventCapacityOverrides are used properly, and typing
 * assertions with typia.assert are applied.
 *
 * No headers or authentication tokens are manually set as the SDK handles
 * this automatically.
 *
 * The test insures the admin role context is established prior to creating
 * and listing capacity overrides, matching the described dependencies.
 */
export async function test_api_event_capacity_override_list_pagination_and_filtering(
  connection: api.IConnection,
) {
  // Step 1. Admin user sign-up
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(64); // simulate SHA-256 hash
  const fullName = RandomGenerator.name();

  // Create admin user with null optional fields explicitly
  const adminCreateBody = {
    email: adminEmail,
    password_hash: passwordHash,
    full_name: fullName,
    phone_number: null,
    profile_picture_url: null,
    email_verified: true,
  } satisfies IEventRegistrationAdmin.ICreate;

  const admin: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // Step 2. Create an event capacity override
  const eventId = typia.random<string & tags.Format<"uuid">>();

  const capacityOverrideCreateBody = {
    event_id: eventId,
    is_override_enabled: RandomGenerator.pick([true, false] as const),
  } satisfies IEventRegistrationEventCapacityOverride.ICreate;

  const createdCapacityOverride: IEventRegistrationEventCapacityOverride =
    await api.functional.eventRegistration.admin.eventCapacityOverrides.createEventCapacityOverride(
      connection,
      {
        body: capacityOverrideCreateBody,
      },
    );
  typia.assert(createdCapacityOverride);
  TestValidator.equals(
    "capacity override event_id matches",
    createdCapacityOverride.event_id,
    eventId,
  );

  // Step 3. List capacity overrides for the event with patch index API
  const page: IPageIEventRegistrationEventCapacityOverrides =
    await api.functional.eventRegistration.admin.events.capacityOverrides.index(
      connection,
      {
        eventId: eventId,
      },
    );
  typia.assert(page);

  // Validate pagination info
  TestValidator.predicate(
    "pagination current page is non-negative",
    page.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    page.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    page.pagination.pages >= 0,
  );

  // Validate at least one capacity override returned
  TestValidator.predicate(
    "capacity override list contains at least one item",
    page.data.length >= 1,
  );

  // Validate the created override is among returned data
  const foundOverride = page.data.find(
    (override) => override.id === createdCapacityOverride.id,
  );
  TestValidator.predicate(
    "created capacity override found in list",
    foundOverride !== undefined,
  );
  if (foundOverride !== undefined) {
    typia.assert(foundOverride);
    TestValidator.equals(
      "found capacity override event_id matches",
      foundOverride.event_id,
      eventId,
    );
    TestValidator.equals(
      "found capacity override is_override_enabled matches",
      foundOverride.is_override_enabled,
      createdCapacityOverride.is_override_enabled,
    );
  }
}
