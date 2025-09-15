import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnalyticsReport";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsAnalyticsReport";

export async function test_api_analytics_reports_pagination_and_filtering_by_org_admin(
  connection: api.IConnection,
) {
  // 1. Create and join a system admin user
  const systemAdminCreateBody = {
    email: `sysadmin${RandomGenerator.alphaNumeric(5)}@enterprise.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);

  // 2. Login as system admin
  const systemAdminLoginBody = {
    email: systemAdmin.email,
    password_hash: systemAdminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  await api.functional.auth.systemAdmin.login(connection, {
    body: systemAdminLoginBody,
  });

  // 3. Create a tenant organization
  const tenantCreateBody = {
    code: `tnt${RandomGenerator.alphaNumeric(5)}`,
    name: `Tenant ${RandomGenerator.name()}`,
  } satisfies IEnterpriseLmsTenant.ICreate;

  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreateBody,
    });
  typia.assert(tenant);

  // 4. Create and join an organization admin user tied to the tenant
  const orgAdminCreateBody = {
    tenant_id: tenant.id,
    email: `orgadmin${RandomGenerator.alphaNumeric(5)}@enterprise.com`,
    password: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: undefined, // optional
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const orgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: orgAdminCreateBody,
    });
  typia.assert(orgAdmin);

  // 5. Login as organization admin
  const orgAdminLoginBody = {
    email: orgAdmin.email,
    password: orgAdminCreateBody.password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  await api.functional.auth.organizationAdmin.login(connection, {
    body: orgAdminLoginBody,
  });

  // 6. Simulate multiple analytics report summaries belonging to the tenant
  const totalReports = 23;
  const generatedReports = ArrayUtil.repeat(totalReports, (index) => {
    return {
      id: typia.random<string & tags.Format<"uuid">>(),
      report_name: `Report #${index + 1} - Tenant ${tenant.code}`,
      report_type: RandomGenerator.pick([
        "completion",
        "engagement",
        "activity",
      ] as const),
    };
  });

  // 7. Search for page 2, limit 10 of reports for the tenant
  const searchBody = {
    tenant_id: tenant.id,
    page: 2,
    limit: 10,
    search: null,
    report_type: null,
    order: "+report_name",
  } satisfies IEnterpriseLmsAnalyticsReport.IRequest;

  const searchResult: IPageIEnterpriseLmsAnalyticsReport.ISummary =
    await api.functional.enterpriseLms.organizationAdmin.analyticsReports.searchAnalyticsReports(
      connection,
      {
        body: searchBody,
      },
    );
  typia.assert(searchResult);

  // 8. Validation of pagination metadata and data
  const { pagination, data } = searchResult;

  TestValidator.equals("pagination current page", pagination.current, 2);
  TestValidator.equals("pagination limit", pagination.limit, 10);
  TestValidator.equals(
    "pagination total records",
    pagination.records,
    totalReports,
  );
  TestValidator.equals(
    "pagination pages",
    pagination.pages,
    Math.ceil(totalReports / 10),
  );

  for (const report of data) {
    typia.assert<string & tags.Format<"uuid">>(report.id);
    TestValidator.predicate(
      "report name contains tenant code",
      report.report_name.includes(tenant.code),
    );
  }

  TestValidator.predicate(
    "data length is less or equal to limit",
    data.length <= searchBody.limit,
  );
}
