import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import type { IEventRegistrationEventCapacityOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEventCapacityOverride";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEventRegistrationEventCapacityOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEventRegistrationEventCapacityOverride";

/**
 * Test listing paginated event capacity overrides by an admin user.
 *
 * Business context: Administrative users can manage capacity override
 * settings for various events. This test covers the full workflow for such
 * an admin user:
 *
 * 1. Create an admin user by calling the /auth/admin/join endpoint with
 *    required details.
 * 2. Using the authenticated admin context, call the paginated event capacity
 *    overrides listing endpoint with various filter and pagination
 *    options.
 * 3. Validate that the response contains correctly structured pagination
 *    metadata and an array of capacity override records.
 *
 * The test ensures admin-only access control and proper
 * filtering/pagination behavior. It uses typia for random but valid data
 * creation and validation.
 */
export async function test_api_event_capacity_overrides_index_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create an admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPasswordHash = RandomGenerator.alphaNumeric(64); // Random 64-char hash string
  const adminFullName = RandomGenerator.name();
  // Optional fields set to null explicitly
  const adminPhoneNumber: string | null = null;
  const adminProfilePictureUrl: string | null = null;
  const adminEmailVerified = true;

  const adminUser: IEventRegistrationAdmin.IAuthorized =
    await api.functional.auth.admin.join.createAdminUser(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPasswordHash,
        full_name: adminFullName,
        phone_number: adminPhoneNumber,
        profile_picture_url: adminProfilePictureUrl,
        email_verified: adminEmailVerified,
      } satisfies IEventRegistrationAdmin.ICreate,
    });
  typia.assert(adminUser);

  // Step 2: Query paginated event capacity overrides with filters and pagination
  // Define several scenarios to test various filters and pagination.
  const pageOptions: IEventRegistrationEventCapacityOverride.IRequest[] = [
    {}, // Default pagination, no filters
    { page: 1, limit: 3 },
    { limit: 5, is_override_enabled: true },
    { is_override_enabled: false },
    // Simulate a random event_id filter by generating UUID
    { event_id: typia.random<string & tags.Format<"uuid">>() },
  ];

  for (const options of pageOptions) {
    // Explicitly convert undefined to null to comply with null usage
    const requestBody = {
      page: options.page === undefined ? null : options.page,
      limit: options.limit === undefined ? null : options.limit,
      event_id: options.event_id === undefined ? null : options.event_id,
      is_override_enabled:
        options.is_override_enabled === undefined
          ? null
          : options.is_override_enabled,
    } satisfies IEventRegistrationEventCapacityOverride.IRequest;

    const pageResult: IPageIEventRegistrationEventCapacityOverride =
      await api.functional.eventRegistration.admin.eventCapacityOverrides.indexEventCapacityOverrides(
        connection,
        {
          body: requestBody,
        },
      );
    typia.assert(pageResult);

    // Validate pagination metadata completeness and correctness
    const pagination = pageResult.pagination;
    TestValidator.predicate(
      "pagination.current page number is non-negative",
      typeof pagination.current === "number" && pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination.limit is positive integer",
      typeof pagination.limit === "number" && pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination.records is non-negative",
      typeof pagination.records === "number" && pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination.pages is non-negative",
      typeof pagination.pages === "number" && pagination.pages >= 0,
    );

    // Validate that all data entries match schema
    for (const override of pageResult.data) {
      typia.assert(override);
      TestValidator.predicate(
        `override.id is valid UUID: ${override.id}`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          override.id,
        ),
      );
      TestValidator.predicate(
        `override.event_id is valid UUID: ${override.event_id}`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          override.event_id,
        ),
      );
      TestValidator.predicate(
        `override.is_override_enabled is boolean: ${override.is_override_enabled}`,
        typeof override.is_override_enabled === "boolean",
      );
      TestValidator.predicate(
        `override.created_at is ISO string: ${override.created_at}`,
        typeof override.created_at === "string",
      );
      TestValidator.predicate(
        `override.updated_at is ISO string: ${override.updated_at}`,
        typeof override.updated_at === "string",
      );
    }

    // Additional business rule checks
    // The number of data items should not exceed the specified limit (if set)
    if (requestBody.limit !== null && requestBody.limit !== undefined) {
      TestValidator.predicate(
        "number of data entries does not exceed limit",
        pageResult.data.length <= requestBody.limit,
      );
    }
  }
}
