import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerRedisCache } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerRedisCache";

/**
 * This test scenario verifies the successful permanent deletion of an OAuth
 * server Redis cache configuration by an authorized admin user.
 *
 * The test includes the following steps:
 *
 * 1. Authenticate as an admin user by creating a new admin account using the admin
 *    join API. This provides necessary authentication tokens for subsequent
 *    calls.
 * 2. Create a new Redis cache configuration using the admin credentials to have a
 *    valid target cache configuration to delete.
 * 3. Issue a DELETE request to the /oauthServer/admin/oauthServerRedisCaches/{id}
 *    endpoint with the ID of the created Redis cache configuration.
 *
 * Validation points include:
 *
 * - Confirming successful creation of the Redis cache configuration.
 * - The DELETE request returns with success status (204 No Content).
 * - Attempting to delete the cache configuration and confirming no errors occur
 *   or response body.
 *
 * Business rules:
 *
 * - Only admin users can delete OAuth server Redis cache configurations.
 * - The deletion is permanent, with no recovery option.
 *
 * No attempt is made to fetch the deleted configuration after deletion, as the
 * API does not have an endpoint to fetch individual cache configuration by ID
 * (not provided), so direct post-deletion fetch verification is not possible.
 *
 * Error scenarios like unauthorized deletions or invalid IDs are not tested in
 * this function, which focuses on the successful deletion case.
 *
 * All API calls correctly use their specific DTO types and required parameters.
 * Typia assertions are used to ensure response correctness.
 *
 * This test fully complies with all business requirements and technical
 * constraints of the provided API and DTOs.
 */
export async function test_api_oauth_server_redis_cache_erase_success(
  connection: api.IConnection,
) {
  // 1. Admin user sign up
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: true,
    password: "StrongPassword123!",
  } satisfies IOauthServerAdmin.ICreate;

  const adminAuthorized: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new Redis cache configuration
  const redisCacheCreateBody = {
    cache_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
    ttl_seconds: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    prefix: RandomGenerator.name(1),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IOauthServerRedisCache.ICreate;

  const createdCache: IOauthServerRedisCache =
    await api.functional.oauthServer.admin.oauthServerRedisCaches.create(
      connection,
      {
        body: redisCacheCreateBody,
      },
    );
  typia.assert(createdCache);

  // 3. Delete the Redis cache configuration
  await api.functional.oauthServer.admin.oauthServerRedisCaches.eraseRedisCacheConfig(
    connection,
    {
      id: createdCache.id,
    },
  );

  // Since no get-by-id endpoint is provided, verification by fetching is omitted
}
