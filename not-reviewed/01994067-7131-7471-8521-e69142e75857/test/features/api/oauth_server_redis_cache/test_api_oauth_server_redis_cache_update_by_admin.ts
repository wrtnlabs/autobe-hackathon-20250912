import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerRedisCache } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerRedisCache";
import type { IOauthServerredisServerRedisCaches } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerredisServerRedisCaches";

/**
 * Validate the updating of Redis cache configurations by admin users.
 *
 * This test ensures that an admin user can register and login, create a
 * Redis cache configuration, update it with valid values, and observe
 * correct audit timestamps. It also verifies that unauthorized users cannot
 * update cache configurations. Validation errors on empty cache_name and
 * ttl_seconds=0 are confirmed, and attempts to update a non-existent cache
 * ID are appropriately handled as errors.
 *
 * All steps include type validation with typia.assert and business logic
 * assertions with TestValidator.
 *
 * Testing covers authorization, validation rules, and proper update
 * operations. This test respects exact DTO schemas without inventing extra
 * properties.
 *
 * @param connection The API connection to use for requests
 */
export async function test_api_oauth_server_redis_cache_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: true,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IOauthServerAdmin.ICreate;

  const adminUser: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminUser);

  // 2. Admin user login
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
  } satisfies IOauthServerAdmin.ILogin;

  const loggedInAdmin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(loggedInAdmin);

  // 3. Create a Redis cache config
  const createBody = {
    cache_name: `cache_${RandomGenerator.alphaNumeric(6)}`,
    ttl_seconds: RandomGenerator.pick([60, 120, 300, 600]),
    prefix: `prefix_${RandomGenerator.alphaNumeric(4)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IOauthServerRedisCache.ICreate;

  const createdCache: IOauthServerRedisCache =
    await api.functional.oauthServer.admin.oauthServerRedisCaches.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdCache);

  // 4. Perform valid update
  const updateBody = {
    cache_name: `${createdCache.cache_name}_updated`,
    ttl_seconds: createdCache.ttl_seconds === 60 ? 120 : 60,
    prefix: null,
    description: `${createdCache.description ?? ""} (updated)`,
  } satisfies IOauthServerredisServerRedisCaches.IUpdate;

  const updatedCache: IOauthServerredisServerRedisCaches =
    await api.functional.oauthServer.admin.oauthServerRedisCaches.updateRedisCacheConfig(
      connection,
      {
        id: createdCache.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCache);

  // Validate updated fields
  TestValidator.equals(
    "updated cache_name should be changed",
    updatedCache.cache_name,
    updateBody.cache_name,
  );
  TestValidator.equals(
    "updated ttl_seconds should be changed",
    updatedCache.ttl_seconds,
    updateBody.ttl_seconds,
  );
  TestValidator.equals(
    "updated prefix should be null",
    updatedCache.prefix,
    null,
  );
  TestValidator.equals(
    "updated description should be changed",
    updatedCache.description,
    updateBody.description,
  );

  // Validate audit timestamps
  TestValidator.predicate(
    "created_at should not change after update",
    createdCache.created_at === updatedCache.created_at,
  );
  TestValidator.predicate(
    "updated_at should be changed and greater after update",
    new Date(updatedCache.updated_at) > new Date(createdCache.updated_at),
  );

  // 5. Unauthorized update attempt (use fresh connection with empty headers)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized user cannot update redis cache",
    async () => {
      await api.functional.oauthServer.admin.oauthServerRedisCaches.updateRedisCacheConfig(
        unauthConnection,
        {
          id: createdCache.id,
          body: {
            cache_name: "hack_attempt",
          } satisfies IOauthServerredisServerRedisCaches.IUpdate,
        },
      );
    },
  );

  // 6. Test update validation errors
  // Empty cache_name (should fail)
  await TestValidator.error(
    "empty cache_name should fail validation",
    async () => {
      await api.functional.oauthServer.admin.oauthServerRedisCaches.updateRedisCacheConfig(
        connection,
        {
          id: createdCache.id,
          body: {
            cache_name: "",
          } satisfies IOauthServerredisServerRedisCaches.IUpdate,
        },
      );
    },
  );

  // TTL seconds 0 (should fail)
  await TestValidator.error(
    "ttl_seconds zero should fail validation",
    async () => {
      await api.functional.oauthServer.admin.oauthServerRedisCaches.updateRedisCacheConfig(
        connection,
        {
          id: createdCache.id,
          body: {
            ttl_seconds: 0,
          } satisfies IOauthServerredisServerRedisCaches.IUpdate,
        },
      );
    },
  );

  // 7. Update non-existent cache ID
  await TestValidator.error(
    "updating non-existent cache id should fail",
    async () => {
      await api.functional.oauthServer.admin.oauthServerRedisCaches.updateRedisCacheConfig(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
          body: {
            cache_name: "nonexistent_cache",
          } satisfies IOauthServerredisServerRedisCaches.IUpdate,
        },
      );
    },
  );
}
