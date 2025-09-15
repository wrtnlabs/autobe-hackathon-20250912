import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBenchmarkDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBenchmarkDefinition";
import type { IHealthcarePlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformKpiSnapshot";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformKpiSnapshot";

/**
 * Validate searching and filtering of KPI snapshots as healthcare platform
 * system admin.
 *
 * Workflow:
 *
 * 1. Register and login as a system admin (local provider, business email,
 *    password).
 * 2. Create a benchmark definition and use its organization_id/benchmark_id as
 *    filter targets.
 * 3. Search for KPI snapshots using PATCH:
 *
 *    - With valid benchmark_id and organization_id, expect either data or empty list
 *         (since data creation isn't available via API)
 *    - With random non-existent org/benchmark IDs, always expect empty results
 * 4. Validate paginated response, correct filter propagation, and empty results
 *    for invalid filters
 *
 * Negative scenario coverage is limited to business-logic-based empty results
 * due to lack of type error or snapshot creation support in the available
 * APIs.
 */
export async function test_api_kpi_snapshot_search_and_filter(
  connection: api.IConnection,
) {
  // Step 1: Register as system admin (local provider)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(2),
      provider: "local",
      provider_key: adminEmail,
      password: "S3curePW!@#",
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // Step 2: Login as system admin
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: "S3curePW!@#",
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(adminLogin);
  TestValidator.equals(
    "admin email from login matches join",
    adminLogin.email,
    adminJoin.email,
  );

  // Step 3: Create a benchmark definition (to obtain valid org/benchmark_id)
  const benchmarkCreate =
    await api.functional.healthcarePlatform.systemAdmin.benchmarkDefinitions.create(
      connection,
      {
        body: {
          organization_id: typia.random<string & tags.Format<"uuid">>(),
          benchmark_code: RandomGenerator.alphaNumeric(8),
          label: RandomGenerator.name(2),
          value: Math.floor(Math.random() * 100) + 1,
          unit: "percent",
          effective_start_at: new Date().toISOString(),
          // No effective_end_at or description (optional)
        } satisfies IHealthcarePlatformBenchmarkDefinition.ICreate,
      },
    );
  typia.assert(benchmarkCreate);

  // Step 4: Search KPI snapshot with valid filter
  const searchValid =
    await api.functional.healthcarePlatform.systemAdmin.kpiSnapshots.index(
      connection,
      {
        body: {
          organization_id: benchmarkCreate.organization_id!,
          benchmark_id: benchmarkCreate.id!,
          page: 1,
          limit: 10,
        } satisfies IHealthcarePlatformKpiSnapshot.IRequest,
      },
    );
  typia.assert(searchValid);
  TestValidator.predicate(
    "pagination current page is 1",
    searchValid.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    searchValid.pagination.limit === 10,
  );
  TestValidator.equals(
    "all returned snapshot orgs match filter",
    searchValid.data.every(
      (x) => x.organization_id === benchmarkCreate.organization_id,
    ),
    true,
  );
  TestValidator.equals(
    "all returned snapshot benchmarks match filter",
    searchValid.data.every((x) => x.benchmark_id === benchmarkCreate.id),
    true,
  );

  // Step 5: Search with non-existent organization, expect empty data
  const nonExistentOrgId = typia.random<string & tags.Format<"uuid">>();
  const searchNonExistentOrg =
    await api.functional.healthcarePlatform.systemAdmin.kpiSnapshots.index(
      connection,
      {
        body: {
          organization_id: nonExistentOrgId,
          benchmark_id: benchmarkCreate.id!,
          page: 1,
          limit: 5,
        } satisfies IHealthcarePlatformKpiSnapshot.IRequest,
      },
    );
  typia.assert(searchNonExistentOrg);
  TestValidator.equals(
    "non-existent org yields empty data",
    searchNonExistentOrg.data.length,
    0,
  );

  // Step 6: Search with non-existent benchmark, expect empty data
  const nonExistentBenchmarkId = typia.random<string & tags.Format<"uuid">>();
  const searchNonExistentBench =
    await api.functional.healthcarePlatform.systemAdmin.kpiSnapshots.index(
      connection,
      {
        body: {
          organization_id: benchmarkCreate.organization_id!,
          benchmark_id: nonExistentBenchmarkId,
          page: 1,
          limit: 5,
        } satisfies IHealthcarePlatformKpiSnapshot.IRequest,
      },
    );
  typia.assert(searchNonExistentBench);
  TestValidator.equals(
    "non-existent benchmark yields empty data",
    searchNonExistentBench.data.length,
    0,
  );

  // Step 7: Search with both org/benchmark fully random, expect empty data
  const searchFullyInvalid =
    await api.functional.healthcarePlatform.systemAdmin.kpiSnapshots.index(
      connection,
      {
        body: {
          organization_id: typia.random<string & tags.Format<"uuid">>(),
          benchmark_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 5,
        } satisfies IHealthcarePlatformKpiSnapshot.IRequest,
      },
    );
  typia.assert(searchFullyInvalid);
  TestValidator.equals(
    "fully random org/benchmark yields empty data",
    searchFullyInvalid.data.length,
    0,
  );
}
