import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IHealthcarePlatformUserAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserAuthentication";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformUserAuthentication } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformUserAuthentication";

/**
 * Test ability of system admin to search and paginate user authentication
 * records with filters, pagination, role restrictions, and coverage for edge
 * cases like large pages and no filters.
 *
 * 1. Create and authenticate a system admin for test context
 * 2. System admin retrieves user authentication records with no filter (full list,
 *    paginated)
 * 3. Filter by provider if data available, assert all match
 * 4. Filter by user_type if data available, assert all match
 * 5. Validate paging with page_size=1, page=2
 * 6. Out-of-bound page results in error or empty result
 * 7. Unauthorized access: unauthenticated connection is denied
 */
export async function test_api_user_authentication_search_with_various_filters(
  connection: api.IConnection,
) {
  // 1. Create and authenticate system admin
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(admin);

  // 2. Search with empty filters for all records (paginated)
  const noFilter =
    await api.functional.healthcarePlatform.systemAdmin.userAuthentications.index(
      connection,
      {
        body: {} satisfies IHealthcarePlatformUserAuthentication.IRequest,
      },
    );
  typia.assert(noFilter);
  TestValidator.predicate(
    "no filter search returns data array and non-negative record count",
    Array.isArray(noFilter.data) && noFilter.pagination.records >= 0,
  );

  // 3. Filter by provider if possible
  const providerSample =
    noFilter.data.length > 0 ? noFilter.data[0].provider : "local";
  const providerFiltered =
    await api.functional.healthcarePlatform.systemAdmin.userAuthentications.index(
      connection,
      {
        body: {
          provider: providerSample,
        } satisfies IHealthcarePlatformUserAuthentication.IRequest,
      },
    );
  typia.assert(providerFiltered);
  if (providerFiltered.data.length > 0)
    TestValidator.predicate(
      "provider-filtered results only contain specified provider",
      providerFiltered.data.every((auth) => auth.provider === providerSample),
    );

  // 4. Filter by user_type if possible
  const userTypeSample =
    noFilter.data.length > 0 ? noFilter.data[0].user_type : undefined;
  if (userTypeSample) {
    const typeFiltered =
      await api.functional.healthcarePlatform.systemAdmin.userAuthentications.index(
        connection,
        {
          body: {
            user_type: userTypeSample,
          } satisfies IHealthcarePlatformUserAuthentication.IRequest,
        },
      );
    typia.assert(typeFiltered);
    if (typeFiltered.data.length > 0)
      TestValidator.predicate(
        "user_type-filtered results only contain specified user_type",
        typeFiltered.data.every((auth) => auth.user_type === userTypeSample),
      );
  }

  // 5. Validate pagination: page_size=1, page=2
  const paged =
    await api.functional.healthcarePlatform.systemAdmin.userAuthentications.index(
      connection,
      {
        body: {
          page: 2 as number,
          page_size: 1 as number,
        } satisfies IHealthcarePlatformUserAuthentication.IRequest,
      },
    );
  typia.assert(paged);
  TestValidator.predicate(
    "pagination parameters produce valid result object with expected paging",
    paged.pagination.limit === 1 && paged.pagination.current === 2,
  );

  // 6. Out-of-bound page: huge page index
  await TestValidator.error(
    "out-of-bounds page returns error or empty result",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.userAuthentications.index(
        connection,
        {
          body: {
            page: 10000,
            page_size: 10,
          } satisfies IHealthcarePlatformUserAuthentication.IRequest,
        },
      );
    },
  );

  // 7. Unauthorized (unauthenticated) connection is denied
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access is denied", async () => {
    await api.functional.healthcarePlatform.systemAdmin.userAuthentications.index(
      unauthConnection,
      {
        body: {} satisfies IHealthcarePlatformUserAuthentication.IRequest,
      },
    );
  });
}
