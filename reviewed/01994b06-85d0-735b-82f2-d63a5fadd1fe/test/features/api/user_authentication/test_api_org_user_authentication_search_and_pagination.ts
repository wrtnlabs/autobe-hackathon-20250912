import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformUserAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserAuthentication";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformUserAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformUserAuthentication";

/**
 * Test organization admin search and pagination of user authentication
 * records with filtering, pagination, and RBAC checks.
 *
 * 1. Register a new organization admin user
 *    (IHealthcarePlatformOrganizationAdmin.IJoin)
 * 2. Login as the organization admin user
 * 3. Search user authentications without any filter
 *    (IHealthcarePlatformUserAuthentication.IRequest)
 *
 *    - Validate returned records all match org-admin visible scope
 *    - Validate page meta info
 * 4. Search with provider_key filter set to known or random value
 *
 *    - If using known value, should return match; random value should return
 *         empty page
 * 5. Search with user_type filter to retrieve only specific user types (try
 *    with real: e.g., 'organizationAdmin' and fake 'nonexistentType')
 *
 *    - Real user_type: Should return at least admin's own record
 *    - Fake: Should return empty page
 * 6. Validate pagination logic with small page_size (e.g., 1 or 2)
 *
 *    - Retrieve first and possible second page, check data, and page meta
 *    - Request page number out of bounds (e.g., 1000), expect empty data or
 *         error
 * 7. Attempt unauthorized search (remove token):
 *
 *    - Should throw error (RBAC)
 * 8. Verify all returned data are of correct summary type, fields, and
 *    pagination info is present
 */
export async function test_api_org_user_authentication_search_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register org admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: "adminpass1234",
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Login as admin to refresh context (just in case)
  const loginRes = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: joinBody.email,
        password: joinBody.password,
      },
    },
  );
  typia.assert(loginRes);

  // 3. Search with no filters
  const noFilterResp =
    await api.functional.healthcarePlatform.organizationAdmin.userAuthentications.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(noFilterResp);
  TestValidator.predicate(
    "no-filter returns at least one record (admin's own)",
    noFilterResp.data.length >= 1,
  );

  // 4. Search using provider_key = exact match of admin, expect at least one result
  const providerKey =
    noFilterResp.data.length > 0
      ? noFilterResp.data[0].provider_key
      : "___unknown___";
  const byProviderKey =
    await api.functional.healthcarePlatform.organizationAdmin.userAuthentications.index(
      connection,
      {
        body: { provider_key: providerKey },
      },
    );
  typia.assert(byProviderKey);
  // If provider_key was real, must match; if made-up, expect empty
  if (noFilterResp.data.length > 0) {
    // Known good value, should match
    TestValidator.predicate(
      "provider_key exact match returns result",
      byProviderKey.data.length >= 1,
    );
    TestValidator.equals(
      "all matching provider_key",
      byProviderKey.data.map((r) => r.provider_key),
      Array(byProviderKey.data.length).fill(providerKey),
    );
  } else {
    TestValidator.equals(
      "no results for bogus provider_key",
      byProviderKey.data.length,
      0,
    );
  }
  // Edge: provider_key random (expect empty)
  const fakeProviderKey = RandomGenerator.alphaNumeric(16);
  const byFakeKey =
    await api.functional.healthcarePlatform.organizationAdmin.userAuthentications.index(
      connection,
      { body: { provider_key: fakeProviderKey } },
    );
  typia.assert(byFakeKey);
  TestValidator.equals(
    "random fake provider_key returns empty page",
    byFakeKey.data.length,
    0,
  );

  // 5. Search with user_type (real and fake)
  // Real: take user_type of admin (should exist)
  const realUserType =
    noFilterResp.data.length > 0
      ? noFilterResp.data[0].user_type
      : "organizationAdmin";
  const byRealUserType =
    await api.functional.healthcarePlatform.organizationAdmin.userAuthentications.index(
      connection,
      {
        body: { user_type: realUserType },
      },
    );
  typia.assert(byRealUserType);
  TestValidator.predicate(
    "real user_type returns at least 1 result",
    byRealUserType.data.length >= 1,
  );
  TestValidator.equals(
    "all results have correct user_type",
    byRealUserType.data.filter(Boolean).map((x) => x.user_type),
    byRealUserType.data.filter(Boolean).map(() => realUserType),
  );
  // Edge: fake user_type (random)
  const fakeUserType = RandomGenerator.alphaNumeric(12);
  const byFakeUserType =
    await api.functional.healthcarePlatform.organizationAdmin.userAuthentications.index(
      connection,
      {
        body: { user_type: fakeUserType },
      },
    );
  typia.assert(byFakeUserType);
  TestValidator.equals(
    "fake user_type returns zero data",
    byFakeUserType.data.length,
    0,
  );

  // 6. Pagination: set page_size = 1, get page 1 and 2, then page 1000
  const pagedPage1 =
    await api.functional.healthcarePlatform.organizationAdmin.userAuthentications.index(
      connection,
      {
        body: {
          page: 1 satisfies number as number,
          page_size: 1 satisfies number as number,
        },
      },
    );
  typia.assert(pagedPage1);
  TestValidator.equals(
    "first page has at most 1 record",
    pagedPage1.data.length <= 1,
    true,
  );
  TestValidator.equals(
    "pagination meta present",
    typeof pagedPage1.pagination,
    "object",
  );
  if (pagedPage1.pagination.pages >= 2) {
    const pagedPage2 =
      await api.functional.healthcarePlatform.organizationAdmin.userAuthentications.index(
        connection,
        {
          body: {
            page: 2 satisfies number as number,
            page_size: 1 satisfies number as number,
          },
        },
      );
    typia.assert(pagedPage2);
    TestValidator.equals(
      "second page has at most 1 record",
      pagedPage2.data.length <= 1,
      true,
    );
  }
  // Edge: out of range page
  const pagedOutOfRange =
    await api.functional.healthcarePlatform.organizationAdmin.userAuthentications.index(
      connection,
      {
        body: {
          page: 1000 satisfies number as number,
          page_size: 1 satisfies number as number,
        },
      },
    );
  typia.assert(pagedOutOfRange);
  TestValidator.equals(
    "out-of-range page returns empty data",
    pagedOutOfRange.data.length,
    0,
  );

  // 7. RBAC: try as unauthenticated (remove token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated RBAC - forbidden", async () => {
    // Call as unauthenticated connection
    await api.functional.healthcarePlatform.organizationAdmin.userAuthentications.index(
      unauthConn,
      {
        body: {},
      },
    );
  });
}
