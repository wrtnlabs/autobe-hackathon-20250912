import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerRedisCache } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerRedisCache";

/**
 * This e2e test validates retrieving details of a Redis cache configuration by
 * ID as an authenticated admin user. It performs admin join, login, Redis cache
 * creation, detail retrieval, and tests authorization errors and not found
 * errors.
 */
export async function test_api_oauth_server_redis_cache_get_detail_as_admin(
  connection: api.IConnection,
) {
  // Step 1. Admin join: create admin account with verified email and password
  const adminEmail = `${RandomGenerator.name(3)}@example.com`;
  const adminPassword = "P@ssw0rd!";

  const admin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2. Admin login: authenticate to obtain fresh token
  const loginAdmin: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IOauthServerAdmin.ILogin,
    });
  typia.assert(loginAdmin);

  // Step 3. Create Redis cache configuration
  const createCacheBody = {
    cache_name: `test-cache-${RandomGenerator.alphaNumeric(6)}`,
    prefix: null,
    ttl_seconds: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    description: null,
  } satisfies IOauthServerRedisCache.ICreate;

  const createdCache: IOauthServerRedisCache =
    await api.functional.oauthServer.admin.oauthServerRedisCaches.create(
      connection,
      {
        body: createCacheBody,
      },
    );
  typia.assert(createdCache);
  TestValidator.equals(
    "created cache name",
    createdCache.cache_name,
    createCacheBody.cache_name,
  );
  TestValidator.equals(
    "created cache prefix",
    createdCache.prefix,
    createCacheBody.prefix,
  );
  TestValidator.equals(
    "created cache ttl_seconds",
    createdCache.ttl_seconds,
    createCacheBody.ttl_seconds,
  );
  TestValidator.equals(
    "created cache description",
    createdCache.description,
    createCacheBody.description,
  );

  // Step 4. Retrieve the Redis cache detail by id
  const cacheDetail: IOauthServerRedisCache =
    await api.functional.oauthServer.admin.oauthServerRedisCaches.at(
      connection,
      {
        id: createdCache.id,
      },
    );
  typia.assert(cacheDetail);
  TestValidator.equals("cache id matches", cacheDetail.id, createdCache.id);
  TestValidator.equals(
    "cache name matches",
    cacheDetail.cache_name,
    createdCache.cache_name,
  );
  TestValidator.equals(
    "cache prefix matches",
    cacheDetail.prefix,
    createdCache.prefix,
  );
  TestValidator.equals(
    "cache ttl_seconds matches",
    cacheDetail.ttl_seconds,
    createdCache.ttl_seconds,
  );
  TestValidator.equals(
    "cache description matches",
    cacheDetail.description,
    createdCache.description,
  );
  TestValidator.predicate(
    "cache has created_at",
    typeof cacheDetail.created_at === "string" &&
      cacheDetail.created_at.length > 0,
  );
  TestValidator.predicate(
    "cache has updated_at",
    typeof cacheDetail.updated_at === "string" &&
      cacheDetail.updated_at.length > 0,
  );

  // Step 5a. Unauthorized retrieval fails (no auth)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access without token", async () => {
    await api.functional.oauthServer.admin.oauthServerRedisCaches.at(
      unauthConnection,
      {
        id: createdCache.id,
      },
    );
  });

  // Step 5b. Unauthorized retrieval fails (wrong role: simulate by fresh conn)
  // We simulate by using a fresh connection without admin token
  const wrongRoleConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access with wrong role", async () => {
    await api.functional.oauthServer.admin.oauthServerRedisCaches.at(
      wrongRoleConnection,
      {
        id: createdCache.id,
      },
    );
  });

  // Step 6. Retrieval of non-existent id fails
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieval fails with non-existent id",
    async () => {
      await api.functional.oauthServer.admin.oauthServerRedisCaches.at(
        connection,
        {
          id: nonExistentId,
        },
      );
    },
  );
}
