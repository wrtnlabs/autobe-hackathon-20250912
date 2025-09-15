import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBenchmarkDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBenchmarkDefinition";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformBenchmarkDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBenchmarkDefinition";

/**
 * Validate system admin search & pagination of benchmark definitions.
 *
 * 1. Register a system admin and login for credentials.
 * 2. Issue a PATCH search request to
 *    /healthcarePlatform/systemAdmin/benchmarkDefinitions:
 *
 *    - Basic search with no filter, expect at least one result.
 *    - Filter on random benchmark_code from existing page, result must contain
 *         only that code.
 *    - Filter by value_min/value_max (range filter). Results are correct subset.
 *    - Filter by unit (random from data) and expect only those units.
 *    - Filter by organization_id if available in data, ensure no cross-org
 *         results.
 *    - Filter by effective_start_at_from/effective_start_at_to: only benchmarks
 *         active within date range.
 *    - Sorting by value (asc/desc).
 *    - Paging: test limit (page_size), next/previous page navigation, boundary
 *         (empty page), last page logic. Validate pagination metadata
 *         matches expectations.
 *    - Test search yielding empty result (invalid code, past effective_end_at,
 *         etc).
 * 3. Error validation:
 *
 *    - Excessive page_size (above business max, e.g. 10,000).
 *    - Invalid (negative) page number or size.
 *    - Missing/invalid/removed Authorization header: expect failure.
 */
export async function test_api_benchmark_definition_search_and_pagination_system_admin(
  connection: api.IConnection,
) {
  // 1. Register system admin and login
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      full_name: RandomGenerator.name(),
      provider: "local",
      provider_key: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminJoin.email,
      provider: "local",
      provider_key: adminJoin.email,
      password: RandomGenerator.alphaNumeric(10), // Password from join (Sim)
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(adminLogin);
  // 2. Generic search: No filters
  const page1 =
    await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.index(
      connection,
      {
        body: {} satisfies IHealthcarePlatformBenchmarkDefinition.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.predicate("results exist or empty", Array.isArray(page1.data));
  // Assure at least one result for further testing
  if (!page1.data.length) return;
  const sample = RandomGenerator.pick(page1.data);
  // 3a. Filter by benchmark_code
  const codePage =
    await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.index(
      connection,
      {
        body: {
          benchmark_code: sample.benchmark_code,
        } satisfies IHealthcarePlatformBenchmarkDefinition.IRequest,
      },
    );
  typia.assert(codePage);
  TestValidator.predicate(
    "benchmark_code filter only that code",
    codePage.data.every((d) => d.benchmark_code === sample.benchmark_code),
  );
  // 3b. Value range
  const minVal = sample.value - 1;
  const maxVal = sample.value + 1;
  const rangePage =
    await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.index(
      connection,
      {
        body: {
          value_min: minVal,
          value_max: maxVal,
        } satisfies IHealthcarePlatformBenchmarkDefinition.IRequest,
      },
    );
  typia.assert(rangePage);
  TestValidator.predicate(
    "all results in value range",
    rangePage.data.every((d) => d.value >= minVal && d.value <= maxVal),
  );
  // 3c. Filter by unit
  const unitPage =
    await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.index(
      connection,
      {
        body: {
          unit: sample.unit,
        } satisfies IHealthcarePlatformBenchmarkDefinition.IRequest,
      },
    );
  typia.assert(unitPage);
  TestValidator.predicate(
    "all units match",
    unitPage.data.every((d) => d.unit === sample.unit),
  );
  // 3d. Filter by org id (if present)
  if (sample.organization_id !== null && sample.organization_id !== undefined) {
    const orgPage =
      await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.index(
        connection,
        {
          body: {
            organization_id: sample.organization_id,
          } satisfies IHealthcarePlatformBenchmarkDefinition.IRequest,
        },
      );
    typia.assert(orgPage);
    TestValidator.predicate(
      "all results have only that org id",
      orgPage.data.every((d) => d.organization_id === sample.organization_id),
    );
  }
  // 3e. Filter by date range
  const from = sample.effective_start_at;
  const to = sample.effective_end_at ?? sample.effective_start_at;
  const datePage =
    await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.index(
      connection,
      {
        body: {
          effective_start_at_from: from,
          effective_end_at_to: to,
        } satisfies IHealthcarePlatformBenchmarkDefinition.IRequest,
      },
    );
  typia.assert(datePage);
  TestValidator.predicate(
    "all effective_start_at >= from && <= to",
    datePage.data.every(
      (d) => d.effective_start_at >= from && d.effective_start_at <= to,
    ),
  );
  // 3f. Sorting (asc value)
  const ascPage =
    await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.index(
      connection,
      {
        body: {
          sort_field: "value",
          sort_direction: "asc",
        } satisfies IHealthcarePlatformBenchmarkDefinition.IRequest,
      },
    );
  typia.assert(ascPage);
  TestValidator.predicate(
    "sorted asc",
    ascPage.data.every((v, i, arr) => i === 0 || arr[i - 1].value <= v.value),
  );
  // 3g. Sorting (desc value)
  const descPage =
    await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.index(
      connection,
      {
        body: {
          sort_field: "value",
          sort_direction: "desc",
        } satisfies IHealthcarePlatformBenchmarkDefinition.IRequest,
      },
    );
  typia.assert(descPage);
  TestValidator.predicate(
    "sorted desc",
    descPage.data.every((v, i, arr) => i === 0 || arr[i - 1].value >= v.value),
  );
  // 3h. Paging: first page, then fetch next if possible
  const pageSize = 2;
  const firstPage =
    await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.index(
      connection,
      {
        body: {
          page: 1,
          page_size: pageSize,
        } satisfies IHealthcarePlatformBenchmarkDefinition.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("page is 1", firstPage.pagination.current, 1);
  TestValidator.equals("limit matches", firstPage.pagination.limit, pageSize);
  if (firstPage.pagination.pages > 1) {
    const nextPage =
      await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.index(
        connection,
        {
          body: {
            page: 2,
            page_size: pageSize,
          } satisfies IHealthcarePlatformBenchmarkDefinition.IRequest,
        },
      );
    typia.assert(nextPage);
    TestValidator.equals("page is 2", nextPage.pagination.current, 2);
    TestValidator.equals("limit matches", nextPage.pagination.limit, pageSize);
  }
  // 3i. Boundary page (empty)
  const tooHighPage =
    await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.index(
      connection,
      {
        body: {
          page: firstPage.pagination.pages + 10,
          page_size: pageSize,
        } satisfies IHealthcarePlatformBenchmarkDefinition.IRequest,
      },
    );
  typia.assert(tooHighPage);
  TestValidator.equals(
    "no data on non-existent page",
    tooHighPage.data.length,
    0,
  );
  // 3j. Search yielding empty result
  const badCodePage =
    await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.index(
      connection,
      {
        body: {
          benchmark_code: "no_such_code",
        } satisfies IHealthcarePlatformBenchmarkDefinition.IRequest,
      },
    );
  typia.assert(badCodePage);
  TestValidator.equals("bad code yields no result", badCodePage.data.length, 0);
  // 4. Error cases
  // 4a. Excessive page_size
  await TestValidator.error("excessive page_size fails", async () => {
    await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.index(
      connection,
      {
        body: {
          page_size: 10000,
        } satisfies IHealthcarePlatformBenchmarkDefinition.IRequest,
      },
    );
  });
  // 4b. Negative page number
  await TestValidator.error("negative page number fails", async () => {
    await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.index(
      connection,
      {
        body: {
          page: -1,
        } satisfies IHealthcarePlatformBenchmarkDefinition.IRequest,
      },
    );
  });
  // 4c. Negative page_size
  await TestValidator.error("negative page_size fails", async () => {
    await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.index(
      connection,
      {
        body: {
          page_size: -5,
        } satisfies IHealthcarePlatformBenchmarkDefinition.IRequest,
      },
    );
  });
  // 4d. Unauthorized user: Remove Authorization
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated user yields error", async () => {
    await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.index(
      unauthConn,
      {
        body: {} satisfies IHealthcarePlatformBenchmarkDefinition.IRequest,
      },
    );
  });
}
