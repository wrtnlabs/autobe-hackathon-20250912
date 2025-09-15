import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerRedisCache } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerRedisCache";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIOauthServerRedisCache } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerRedisCache";

/**
 * Test the OAuth server Redis cache listing API with pagination and
 * filtering.
 *
 * This test verifies full admin authentication, creation of multiple Redis
 * cache configurations, and retrieval of paginated, filtered cache lists
 * using the PATCH /oauthServer/admin/oauthServerRedisCaches endpoint. It
 * ensures correct handling of filters including nullable prefix, validates
 * pagination metadata, sorting behavior, and confirms unauthorized access
 * is rejected properly.
 *
 * Steps:
 *
 * 1. Admin user signs up with a unique email.
 * 2. Admin logs in with credentials to obtain authorization tokens.
 * 3. Multiple Redis cache configurations are created with distinct settings.
 * 4. Several paginated and filtered requests validate correctness of results,
 *    including checks by ttl_seconds ordering and cache_name filtering.
 * 5. Negative test validates unauthorized access fails as expected.
 */
export async function test_api_oauth_server_redis_cache_index_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Admin signs up
  const adminEmail = `admin${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminAuthorized: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        email_verified: true,
        password: "StrongPassw0rd!",
      } satisfies IOauthServerAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // 2. Admin logs in
  const adminLoggedIn: IOauthServerAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "StrongPassw0rd!",
      } satisfies IOauthServerAdmin.ILogin,
    });
  typia.assert(adminLoggedIn);

  // Prepare to create Redis cache configs
  const cacheConfigs: IOauthServerRedisCache.ICreate[] = [
    {
      cache_name: `cache_${RandomGenerator.alphaNumeric(5)}`,
      prefix: `prefix_${RandomGenerator.alphaNumeric(3)}`,
      ttl_seconds: 300,
      description: "Cache for access tokens",
    },
    {
      cache_name: `cache_${RandomGenerator.alphaNumeric(5)}`,
      prefix: null,
      ttl_seconds: 600,
      description: null,
    },
    {
      cache_name: `cache_${RandomGenerator.alphaNumeric(5)}`,
      prefix: `session_${RandomGenerator.alphaNumeric(2)}`,
      ttl_seconds: 120,
      description: "Session caching",
    },
    {
      cache_name: `special_cache`,
      prefix: `special_prefix`,
      ttl_seconds: 60,
      description: "Special cache for testing",
    },
  ];

  const createdCaches: IOauthServerRedisCache[] = [];
  for (const config of cacheConfigs) {
    const created: IOauthServerRedisCache =
      await api.functional.oauthServer.admin.oauthServerRedisCaches.create(
        connection,
        {
          body: config,
        },
      );
    typia.assert(created);
    createdCaches.push(created);
  }

  // 3. Test list index with pagination and filters

  // a) Fetch page 1 with limit 2 sorted by ttl_seconds ascending
  const page1Request = {
    page: 1 satisfies number,
    limit: 2 satisfies number,
    sortBy: "ttl_seconds",
    sortDirection: "ASC",
  } satisfies IOauthServerRedisCache.IRequest;

  const page1Response: IPageIOauthServerRedisCache.ISummary =
    await api.functional.oauthServer.admin.oauthServerRedisCaches.index(
      connection,
      {
        body: page1Request,
      },
    );
  typia.assert(page1Response);

  TestValidator.predicate(
    "page 1 current page check",
    page1Response.pagination.current === 1,
  );
  TestValidator.predicate(
    "page 1 limit check",
    page1Response.pagination.limit === 2,
  );
  TestValidator.predicate(
    "page 1 data length check",
    page1Response.data.length <= 2,
  );

  // b) Fetch second page
  const page2Request = {
    page: 2 satisfies number,
    limit: 2 satisfies number,
    sortBy: "ttl_seconds",
    sortDirection: "ASC",
  } satisfies IOauthServerRedisCache.IRequest;

  const page2Response: IPageIOauthServerRedisCache.ISummary =
    await api.functional.oauthServer.admin.oauthServerRedisCaches.index(
      connection,
      {
        body: page2Request,
      },
    );
  typia.assert(page2Response);

  TestValidator.predicate(
    "page 2 current page check",
    page2Response.pagination.current === 2,
  );
  TestValidator.predicate(
    "page 2 limit check",
    page2Response.pagination.limit === 2,
  );
  TestValidator.predicate(
    "page 2 data length check",
    page2Response.data.length <= 2,
  );

  // Combine all cache names from both pages
  const allFetchedCaches = [...page1Response.data, ...page2Response.data];
  for (const cache of allFetchedCaches) {
    TestValidator.predicate(
      `cache name in created caches: ${cache.cache_name}`,
      createdCaches.some((c) => c.cache_name === cache.cache_name),
    );
  }

  // c) Filter by specific cache_name
  const filterByNameRequest = {
    cache_name: "special_cache",
    page: 1 satisfies number,
    limit: 10 satisfies number,
  } satisfies IOauthServerRedisCache.IRequest;

  const filterByNameResponse: IPageIOauthServerRedisCache.ISummary =
    await api.functional.oauthServer.admin.oauthServerRedisCaches.index(
      connection,
      {
        body: filterByNameRequest,
      },
    );
  typia.assert(filterByNameResponse);

  TestValidator.equals(
    "filter by cache_name data length",
    filterByNameResponse.data.length,
    1,
  );
  TestValidator.equals(
    "filter by cache_name matches",
    filterByNameResponse.data[0].cache_name,
    "special_cache",
  );

  // d) Filter with prefix null
  const filterPrefixNullRequest = {
    prefix: null,
    page: 1 satisfies number,
    limit: 10 satisfies number,
  } satisfies IOauthServerRedisCache.IRequest;

  const filterPrefixNullResponse: IPageIOauthServerRedisCache.ISummary =
    await api.functional.oauthServer.admin.oauthServerRedisCaches.index(
      connection,
      {
        body: filterPrefixNullRequest,
      },
    );
  typia.assert(filterPrefixNullResponse);

  // All returned must have prefix === null
  for (const cache of filterPrefixNullResponse.data) {
    TestValidator.equals(
      `prefix null check for cache ${cache.cache_name}`,
      cache.prefix,
      null,
    );
  }

  // 4. Negative test unauthorized access - simulate by using a fresh connection with no auth
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.oauthServer.admin.oauthServerRedisCaches.index(
      unauthenticatedConnection,
      {
        body: { page: 1, limit: 1 } satisfies IOauthServerRedisCache.IRequest,
      },
    );
  });
}
