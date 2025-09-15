import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerRedisCache } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerRedisCache";

/**
 * Test the creation of Redis cache configurations by an admin user, including
 * positive cases, validation errors, role-based access control, and duplicate
 * cache handling.
 *
 * This test covers:
 *
 * 1. Admin signup and login processes.
 * 2. Creation of a valid Redis cache configuration.
 * 3. Rejection of invalid inputs such as negative TTL and empty cache_name.
 * 4. Prevention of Redis cache creation by unauthenticated (non-admin) users.
 * 5. Handling attempts to create Redis caches with duplicate names.
 */
export async function test_api_oauth_server_redis_cache_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin user
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinInput = {
    email: adminEmail,
    email_verified: true,
    password: "securePassword123!",
  } satisfies IOauthServerAdmin.ICreate;
  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(admin);

  const adminLoginInput = {
    email: adminEmail,
    password: "securePassword123!",
  } satisfies IOauthServerAdmin.ILogin;
  const adminLogined: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginInput,
    });
  typia.assert(adminLogined);

  // 2. Admin submits valid Redis cache creation
  const cacheName = `cache_${RandomGenerator.alphabets(8)}`;
  const validCacheCreateBody = {
    cache_name: cacheName,
    prefix: `prefix_${RandomGenerator.alphabets(4)}`,
    ttl_seconds: 3600,
    description: "Test Redis cache for authorization tokens",
  } satisfies IOauthServerRedisCache.ICreate;
  const createdCache: IOauthServerRedisCache =
    await api.functional.oauthServer.admin.oauthServerRedisCaches.create(
      connection,
      {
        body: validCacheCreateBody,
      },
    );
  typia.assert(createdCache);
  TestValidator.equals(
    "cache_name matches",
    createdCache.cache_name,
    validCacheCreateBody.cache_name,
  );
  TestValidator.equals(
    "prefix matches",
    createdCache.prefix ?? null,
    validCacheCreateBody.prefix ?? null,
  );
  TestValidator.equals(
    "ttl_seconds matches",
    createdCache.ttl_seconds,
    validCacheCreateBody.ttl_seconds,
  );
  TestValidator.equals(
    "description matches",
    createdCache.description ?? null,
    validCacheCreateBody.description ?? null,
  );
  TestValidator.predicate(
    "created_at is ISO date",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
      createdCache.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO date",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
      createdCache.updated_at,
    ),
  );
  TestValidator.equals(
    "deleted_at is null",
    createdCache.deleted_at ?? null,
    null,
  );

  // 3. Admin tries to create cache with negative ttl_seconds
  const invalidNegativeTTLBody = {
    cache_name: `cache_negttl_${RandomGenerator.alphabets(5)}`,
    prefix: null,
    ttl_seconds: -10,
    description: null,
  } satisfies IOauthServerRedisCache.ICreate;
  await TestValidator.error("reject negative ttl_seconds", async () => {
    await api.functional.oauthServer.admin.oauthServerRedisCaches.create(
      connection,
      {
        body: invalidNegativeTTLBody,
      },
    );
  });

  // 4. Admin tries to create cache with empty cache_name
  const invalidEmptyCacheNameBody = {
    cache_name: "",
    prefix: null,
    ttl_seconds: 100,
    description: "Empty cache name should fail",
  } satisfies IOauthServerRedisCache.ICreate;
  await TestValidator.error("reject empty cache_name", async () => {
    await api.functional.oauthServer.admin.oauthServerRedisCaches.create(
      connection,
      {
        body: invalidEmptyCacheNameBody,
      },
    );
  });

  // 5. Non-admin user cannot create Redis cache (simulate by clearing headers to unauthenticated)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("non-admin cannot create redis cache", async () => {
    await api.functional.oauthServer.admin.oauthServerRedisCaches.create(
      unauthenticatedConnection,
      {
        body: validCacheCreateBody,
      },
    );
  });

  // 6. Create cache with duplicate cache_name
  const duplicateCacheBody = {
    cache_name: cacheName,
    prefix: `prefix_dup_${RandomGenerator.alphabets(4)}`,
    ttl_seconds: 7200,
    description: "Duplicate cache name attempt",
  } satisfies IOauthServerRedisCache.ICreate;
  await TestValidator.error("reject duplicate cache_name", async () => {
    await api.functional.oauthServer.admin.oauthServerRedisCaches.create(
      connection,
      {
        body: duplicateCacheBody,
      },
    );
  });
}
