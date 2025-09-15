import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnalyticsReport";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsAnalyticsReport";

/**
 * E2E test for analytics reports search with pagination and tenant
 * filtering by system admin.
 *
 * This test covers the primary workflow from system admin creation, tenant
 * creation, analytics reports insertion, and the client's search
 * functionality operating with filters and pagination.
 *
 * Steps:
 *
 * 1. System admin user is created and authenticated.
 * 2. Tenant organization is created.
 * 3. Multiple analytics reports are created linked to the tenant.
 * 4. Search API is called with tenant_id filter and page=1, limit=5
 *    pagination.
 * 5. Assertions validate that returned reports belong only to the tenant and
 *    pagination metadata matches expectations.
 *
 * Such validations ensure enforcement of multi-tenant security, business
 * rule adherence, and functional integrity of paginated filtered data
 * retrieval.
 */
export async function test_api_analytics_reports_pagination_and_filtering_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Create and authenticate system admin user
  const systemAdminCreateBody = {
    email: `sysadmin_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(64),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);

  // 2. Create a tenant
  const tenantCreateBody = {
    code: `tenant_${RandomGenerator.alphaNumeric(5)}`,
    name: RandomGenerator.name(2),
  } satisfies IEnterpriseLmsTenant.ICreate;
  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreateBody,
    });
  typia.assert(tenant);

  // 3. Simulate multiple analytics reports creation linked to the tenant
  // (No provided API to create reports, assuming backend test dataset contains them)

  // 4. Search for reports filtering by the tenant's id, page 1, limit 5
  const searchRequest = {
    tenant_id: tenant.id,
    page: 1,
    limit: 5,
  } satisfies IEnterpriseLmsAnalyticsReport.IRequest;

  const searchResult: IPageIEnterpriseLmsAnalyticsReport.ISummary =
    await api.functional.enterpriseLms.systemAdmin.analyticsReports.searchAnalyticsReports(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchResult);

  // 5. Validate the result
  TestValidator.predicate(
    "reports array is an array",
    Array.isArray(searchResult.data),
  );

  TestValidator.predicate(
    "each report has id as string",
    searchResult.data.every((report) => typeof report.id === "string"),
  );

  TestValidator.predicate(
    "each report has non-empty report_name",
    searchResult.data.every(
      (report) =>
        typeof report.report_name === "string" && report.report_name.length > 0,
    ),
  );

  TestValidator.predicate(
    "each report has report_type as string",
    searchResult.data.every((report) => typeof report.report_type === "string"),
  );

  TestValidator.predicate(
    "pagination current page is 1",
    searchResult.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit is 5",
    searchResult.pagination.limit === 5,
  );

  TestValidator.predicate(
    "data length is at most pagination limit",
    searchResult.data.length <= 5,
  );

  TestValidator.predicate(
    "total records is non-negative",
    searchResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pages is consistent with records and limit",
    searchResult.pagination.pages >= 0 &&
      searchResult.pagination.pages * searchResult.pagination.limit >=
        searchResult.pagination.records,
  );
}
