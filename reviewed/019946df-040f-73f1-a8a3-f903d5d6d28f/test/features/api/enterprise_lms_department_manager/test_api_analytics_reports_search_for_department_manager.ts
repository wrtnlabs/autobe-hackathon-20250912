import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnalyticsReport";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsAnalyticsReport";

/**
 * This E2E test validates the analytics reports search functionality for
 * the Department Manager role within Enterprise LMS. It performs end-to-end
 * verification covering:
 *
 * 1. Department Manager user registration and authentication
 * 2. Authorization enforcement and tenant data scoping
 * 3. Pagination and filter usage for searching analytics reports
 * 4. Validation of response schema and business logic
 * 5. Error handling for unauthorized access and invalid inputs
 *
 * Steps:
 *
 * 1. Create and authenticate a Department Manager user with realistic data and
 *    confirm the returned authorization and tenant context.
 * 2. Login with the same user to obtain a valid access token.
 * 3. Confirm that unauthenticated calls to the analytics reports search
 *    endpoint are rejected.
 * 4. Search analytics reports with pagination and tenant_id filter, validating
 *    that returned data conforms to the tenant scope and correct pagination
 *    metadata is provided.
 * 5. Filter reports by an existing report_type and confirm all returned
 *    reports match the filter.
 * 6. Verify error responses when invalid pagination parameters are used.
 */
export async function test_api_analytics_reports_search_for_department_manager(
  connection: api.IConnection,
) {
  // Step 1: Create Department Manager user
  const joinBody = {
    email: `${RandomGenerator.name(1)}.${RandomGenerator.name(1)}@example.com`,
    password: "secret123",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsDepartmentManager.ICreate;

  const authorizedUser = await api.functional.auth.departmentManager.join(
    connection,
    { body: joinBody },
  );
  typia.assert(authorizedUser);

  // Step 2: Login with created user credentials
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IEnterpriseLmsDepartmentManager.ILogin;

  const loggedInUser = await api.functional.auth.departmentManager.login(
    connection,
    { body: loginBody },
  );
  typia.assert(loggedInUser);

  // Create unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 3: Validate unauthenticated access fails
  await TestValidator.error(
    "unauthenticated analytics reports search should fail",
    async () => {
      await api.functional.enterpriseLms.departmentManager.analyticsReports.searchAnalyticsReports(
        unauthConn,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies IEnterpriseLmsAnalyticsReport.IRequest,
        },
      );
    },
  );

  // Step 4: Search analytics reports with pagination and tenant_id filter
  const searchFilters1 = {
    page: 1,
    limit: 10,
    tenant_id: authorizedUser.tenant_id,
    report_type: null,
    search: null,
    order: null,
  } satisfies IEnterpriseLmsAnalyticsReport.IRequest;

  const reportPage1 =
    await api.functional.enterpriseLms.departmentManager.analyticsReports.searchAnalyticsReports(
      connection,
      { body: searchFilters1 },
    );
  typia.assert(reportPage1);

  // Validate reports contain required properties with valid data
  for (const report of reportPage1.data) {
    TestValidator.predicate(
      `report id should be a non-empty string`,
      typeof report.id === "string" && report.id.length > 0,
    );
    TestValidator.predicate(
      `report report_name should be a non-empty string`,
      typeof report.report_name === "string" && report.report_name.length > 0,
    );
    TestValidator.predicate(
      `report report_type should be a non-empty string`,
      typeof report.report_type === "string" && report.report_type.length > 0,
    );
  }

  // Validate pagination metadata correctness
  TestValidator.predicate(
    "pagination current page is positive",
    reportPage1.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    reportPage1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    reportPage1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    reportPage1.pagination.pages >= 0,
  );

  // Step 5: Filter reports by an existing report_type if any available
  const reportTypes = Array.from(
    new Set(reportPage1.data.map((r) => r.report_type)),
  ).filter((t) => t !== null && t !== undefined);
  if (reportTypes.length > 0) {
    const searchFilters2 = {
      page: 1,
      limit: 5,
      tenant_id: authorizedUser.tenant_id,
      report_type: reportTypes[0],
      search: null,
      order: null,
    } satisfies IEnterpriseLmsAnalyticsReport.IRequest;

    const reportPage2 =
      await api.functional.enterpriseLms.departmentManager.analyticsReports.searchAnalyticsReports(
        connection,
        { body: searchFilters2 },
      );
    typia.assert(reportPage2);

    for (const report of reportPage2.data) {
      TestValidator.equals(
        `filtered report_type matches expected`,
        report.report_type,
        reportTypes[0],
      );
      TestValidator.predicate(
        `filtered report id is non-empty string`,
        typeof report.id === "string" && report.id.length > 0,
      );
    }
  }

  // Step 6: Test invalid pagination parameters produce errors
  await TestValidator.error(
    "analytics report search should fail with invalid page and limit",
    async () => {
      await api.functional.enterpriseLms.departmentManager.analyticsReports.searchAnalyticsReports(
        connection,
        {
          body: {
            page: 0,
            limit: 0,
            tenant_id: authorizedUser.tenant_id,
            report_type: null,
            search: null,
            order: null,
          } satisfies IEnterpriseLmsAnalyticsReport.IRequest,
        },
      );
    },
  );
}
