import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBenchmarkDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBenchmarkDefinition";
import type { IHealthcarePlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartment";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformKpiSnapshot";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformKpiSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformKpiSnapshot";

/**
 * Validate the department head's KPI snapshot search functionality with proper
 * authentication and filtering logic.
 *
 * This test registers an organization admin, creates an organization and a
 * department, defines a benchmark, then registers and authenticates a
 * department head. The department head accesses the KPI snapshot index/search
 * endpoint with various combinations of filters (organization, department,
 * benchmark). Pagination is verified, result data is validated for relevance to
 * the department, and access control to other organizations is denied.
 *
 * Steps:
 *
 * 1. Register and login as OrganizationAdmin
 * 2. Create a department for the organization
 * 3. Create a benchmark definition in the organization
 * 4. Register and login as DepartmentHead
 * 5. DepartmentHead requests kpiSnapshots.index with matching filters; validate
 *    that department data is included
 * 6. DepartmentHead requests with incorrect organization_id; verify error or
 *    empty/denied response
 * 7. Validate pagination/meta behavior.
 */
export async function test_api_kpi_snapshot_department_head_search_by_benchmark_with_authentication(
  connection: api.IConnection,
) {
  // Register organization admin & login
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        password: orgAdminPassword,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminJoin);
  // login as org admin is automatic via SDK, but can do so again explicitly
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // Create a department for the organization
  const departmentCreate = {
    healthcare_platform_organization_id: orgAdminJoin.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(2),
    status: "active",
  } satisfies IHealthcarePlatformDepartment.ICreate;
  const department =
    await api.functional.healthcarePlatform.organizationAdmin.organizations.departments.create(
      connection,
      {
        organizationId: orgAdminJoin.id,
        body: departmentCreate,
      },
    );
  typia.assert(department);

  // Create a benchmark definition (for the org)
  const now = new Date();
  const benchmarkDefCreate = {
    organization_id: orgAdminJoin.id,
    benchmark_code: RandomGenerator.alphaNumeric(8),
    label: RandomGenerator.paragraph({ sentences: 2 }),
    value: Math.round(Math.random() * 1000) / 10,
    unit: RandomGenerator.pick(["score", "percent"] as const),
    effective_start_at: now.toISOString(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    effective_end_at: null,
  } satisfies IHealthcarePlatformBenchmarkDefinition.ICreate;
  const benchmark =
    await api.functional.healthcarePlatform.organizationAdmin.benchmarkDefinitions.create(
      connection,
      { body: benchmarkDefCreate },
    );
  typia.assert(benchmark);

  // Register department head
  const deptHeadEmail = typia.random<string & tags.Format<"email">>();
  const deptHeadPassword = RandomGenerator.alphaNumeric(12);
  const deptHeadJoin = await api.functional.auth.departmentHead.join(
    connection,
    {
      body: {
        email: deptHeadEmail,
        full_name: RandomGenerator.name(),
        password: deptHeadPassword,
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
    },
  );
  typia.assert(deptHeadJoin);
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: deptHeadEmail,
      password: deptHeadPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // (Department head) Query the KPI snapshot index with all filters set to own org/department/benchmark
  const searchRequest = {
    organization_id: orgAdminJoin.id,
    department_id: department.id,
    benchmark_id: benchmark.id,
    page: 1,
    limit: 20,
    sort_by: "recorded_at",
    sort_direction: "desc",
  } satisfies IHealthcarePlatformKpiSnapshot.IRequest;

  const page =
    await api.functional.healthcarePlatform.departmentHead.kpiSnapshots.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "pagination current page is 1",
    page.pagination.current,
    1,
  );
  TestValidator.predicate(
    "results do not exceed limit",
    page.data.length <= 20,
  );
  for (const kpi of page.data) {
    TestValidator.equals(
      "KPI organization",
      kpi.organization_id,
      orgAdminJoin.id,
    );
    TestValidator.equals("KPI department", kpi.department_id, department.id);
    TestValidator.equals("KPI benchmark", kpi.benchmark_id, benchmark.id);
  }

  // Query with wrong organization id (should deny/empty)
  const fakeOrgId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deny searching with wrong organization_id",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.kpiSnapshots.index(
        connection,
        {
          body: {
            ...searchRequest,
            organization_id: fakeOrgId,
          },
        },
      );
    },
  );

  // Pagination: if results exist, test for multiple pages
  if (page.data.length > 0 && page.pagination.pages > 1) {
    const page2 =
      await api.functional.healthcarePlatform.departmentHead.kpiSnapshots.index(
        connection,
        {
          body: {
            ...searchRequest,
            page: 2,
          },
        },
      );
    typia.assert(page2);
    TestValidator.equals(
      "pagination current page is 2",
      page2.pagination.current,
      2,
    );
  }
}
