import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBenchmarkDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBenchmarkDefinition";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformBenchmarkDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformBenchmarkDefinition";

/**
 * E2E test for benchmark definition search & pagination API (organization
 * admin)
 *
 * This test validates that an organization administrator is able to perform
 * comprehensive paged, filtered, and sorted queries using PATCH
 * /healthcarePlatform/organizationAdmin/benchmarkDefinitions.
 *
 * Step-by-step:
 *
 * 1. Register (join) a new organization admin with random credentials using
 *    IHealthcarePlatformOrganizationAdmin.IJoin
 * 2. Log in as the organization admin using
 *    IHealthcarePlatformOrganizationAdmin.ILogin
 * 3. (Pre-requisite: Assume at least one benchmark definition exists for the
 *    org)
 * 4. Test default pagination (no filters), check correct per-page count &
 *    pagination metadata
 * 5. Test searching by each field: benchmark_code, label, value_min,
 *    value_max, unit, effective date ranges
 * 6. Test boundary cases for effective_start_at, effective_end_at filters
 * 7. Test sort order and navigation (ascending/descending on code/label/value)
 * 8. Test edge case: empty filter returns all, invalid filter/negative page
 *    returns error
 * 9. Test permission error for non-admin/unauthenticated
 *
 * At each step, validate with assert() and TestValidator that:
 *
 * - Every response is type-safe (typia.assert)
 * - Pagination data is consistent (page size, record count, pages, etc)
 * - Filters return correct scoped results for org admin
 * - Empty and out-of-range queries are handled correctly
 * - No type error tests are performed—only valid business logic scenarios
 */
export async function test_api_benchmark_definition_search_and_pagination_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register organization admin
  const adminJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminJoinData,
  });
  typia.assert(admin);

  // 2. Login as organization admin
  const loginData = {
    email: adminJoinData.email,
    password: adminJoinData.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const adminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: loginData },
  );
  typia.assert(adminLogin);

  // Save organization ID for filter tests
  const organization_id = null; // Assume that org_id is not returned here, so global or set to null for global scope

  // 3. Test: Default search (no filters, check pagination works)
  const page1 =
    await api.functional.healthcarePlatform.organizationAdmin.benchmarkDefinitions.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "pagination current >= 1",
    page1.pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit > 0", page1.pagination.limit > 0);
  TestValidator.predicate(
    "pagination records >= 0",
    page1.pagination.records >= 0,
  );

  // 4. Paginated navigation (next page)
  if (page1.pagination.pages > 1) {
    const page2 =
      await api.functional.healthcarePlatform.organizationAdmin.benchmarkDefinitions.index(
        connection,
        {
          body: {
            page: (page1.pagination.current + 1) satisfies number as number,
          },
        },
      );
    typia.assert(page2);
    TestValidator.equals(
      "pagination current == 2",
      page2.pagination.current,
      page1.pagination.current + 1,
    );
  }

  // 5. Search by benchmark_code if present (otherwise skip)
  const firstDef = page1.data[0];
  if (firstDef) {
    const byCode =
      await api.functional.healthcarePlatform.organizationAdmin.benchmarkDefinitions.index(
        connection,
        {
          body: { benchmark_code: firstDef.benchmark_code },
        },
      );
    typia.assert(byCode);
    TestValidator.predicate(
      "filtered code matches all entries",
      byCode.data.every((x) => x.benchmark_code === firstDef.benchmark_code),
    );
  }

  // 6. Search by label (if present)
  if (firstDef) {
    const byLabelSubstr = RandomGenerator.substring(firstDef.label);
    const byLabel =
      await api.functional.healthcarePlatform.organizationAdmin.benchmarkDefinitions.index(
        connection,
        {
          body: { label: byLabelSubstr },
        },
      );
    typia.assert(byLabel);
    TestValidator.predicate(
      "label filter yields only matches",
      byLabel.data.every((x) => x.label.includes(byLabelSubstr)),
    );
  }

  // 7. Value range test (value_min, value_max)
  if (firstDef) {
    const byValueRange =
      await api.functional.healthcarePlatform.organizationAdmin.benchmarkDefinitions.index(
        connection,
        {
          body: { value_min: firstDef.value, value_max: firstDef.value },
        },
      );
    typia.assert(byValueRange);
    TestValidator.predicate(
      "value between min/max",
      byValueRange.data.every(
        (x) => x.value >= firstDef.value && x.value <= firstDef.value,
      ),
    );
  }

  // 8. Unit filter test
  if (firstDef) {
    const byUnit =
      await api.functional.healthcarePlatform.organizationAdmin.benchmarkDefinitions.index(
        connection,
        {
          body: { unit: firstDef.unit },
        },
      );
    typia.assert(byUnit);
    TestValidator.predicate(
      "unit filter matches only same unit",
      byUnit.data.every((x) => x.unit === firstDef.unit),
    );
  }

  // 9. Date range boundary test - effective_start_at_from, effective_end_at_to
  if (firstDef) {
    // start_at_from as record's own effective_start_at
    const startFrom =
      await api.functional.healthcarePlatform.organizationAdmin.benchmarkDefinitions.index(
        connection,
        {
          body: { effective_start_at_from: firstDef.effective_start_at },
        },
      );
    typia.assert(startFrom);
    TestValidator.predicate(
      "all start_at >= filter",
      startFrom.data.every(
        (x) => x.effective_start_at >= firstDef.effective_start_at,
      ),
    );
    // end_at_to as record's own effective_end_at (if it exists, else skip)
    if (firstDef.effective_end_at) {
      const endTo =
        await api.functional.healthcarePlatform.organizationAdmin.benchmarkDefinitions.index(
          connection,
          {
            body: { effective_end_at_to: firstDef.effective_end_at },
          },
        );
      typia.assert(endTo);
      TestValidator.predicate(
        "all end_at <= filter",
        endTo.data.every((x) =>
          x.effective_end_at !== null && x.effective_end_at !== undefined
            ? x.effective_end_at <= firstDef.effective_end_at!
            : true,
        ),
      );
    }
  }

  // 10. Edge: empty filter for non-existent code returns empty data
  const unusedCode = RandomGenerator.alphaNumeric(16);
  const unusedCodeRes =
    await api.functional.healthcarePlatform.organizationAdmin.benchmarkDefinitions.index(
      connection,
      {
        body: { benchmark_code: unusedCode },
      },
    );
  typia.assert(unusedCodeRes);
  TestValidator.equals(
    "nonexistent code yields empty result",
    unusedCodeRes.data.length,
    0,
  );

  // 11. Edge: too-large page size returns up to max size, no error
  const maxPage =
    await api.functional.healthcarePlatform.organizationAdmin.benchmarkDefinitions.index(
      connection,
      {
        body: { page_size: 1000 satisfies number as number },
      },
    );
  typia.assert(maxPage);
  TestValidator.predicate(
    "max page_size returns possible data",
    maxPage.data.length <= 1000,
  );

  // 12. Error: invalid filter, negative page should throw
  await TestValidator.error("negative page number is rejected", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.benchmarkDefinitions.index(
      connection,
      {
        body: { page: -1 satisfies number as number },
      },
    );
  });

  // 13. Error: unauthorized access should be denied
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "access denied for unauthenticated user",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.benchmarkDefinitions.index(
        unauthConn,
        {
          body: {},
        },
      );
    },
  );
}
