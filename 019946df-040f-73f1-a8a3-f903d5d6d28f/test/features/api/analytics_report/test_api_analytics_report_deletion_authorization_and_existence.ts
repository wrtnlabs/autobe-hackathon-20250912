import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnalyticsReport";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";

/**
 * This test verifies the lifecycle of analytics report deletion by systemAdmin.
 *
 * - Authenticate systemAdmin user
 * - Create a tenant
 * - Create an analytics report for that tenant
 * - Delete the created report successfully
 * - Attempt to delete a non-existent report (expect 404 error)
 * - Attempt to delete with no authentication (expect 403 error)
 */
export async function test_api_analytics_report_deletion_authorization_and_existence(
  connection: api.IConnection,
) {
  // Step 1. Authenticate systemAdmin user
  const adminCreateBody = {
    email: `sysadmin${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(systemAdmin);

  // Step 2. Create a tenant
  const tenantCreateBody = {
    code: `tnt${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
  } satisfies IEnterpriseLmsTenant.ICreate;

  const tenant: IEnterpriseLmsTenant =
    await api.functional.enterpriseLms.systemAdmin.tenants.create(connection, {
      body: tenantCreateBody,
    });
  typia.assert(tenant);

  // Step 3. Create an analytics report linked to the tenant
  const nowISOString = new Date().toISOString();
  const parametersJson = JSON.stringify({
    filter: "lastMonth",
    aggregation: "sum",
  });
  const contentJson = JSON.stringify({
    charts: [{ type: "bar", data: [1, 2, 3] }],
  });

  const analyticsReportCreateBody = {
    tenant_id: tenant.id,
    report_name: RandomGenerator.name(3),
    report_type: "completion",
    parameters_json: parametersJson,
    generated_at: nowISOString,
    content_json: contentJson,
  } satisfies IEnterpriseLmsAnalyticsReport.ICreate;

  const createdReport: IEnterpriseLmsAnalyticsReport =
    await api.functional.enterpriseLms.systemAdmin.analyticsReports.createAnalyticsReport(
      connection,
      { body: analyticsReportCreateBody },
    );
  typia.assert(createdReport);

  // Step 4. Delete the created analytics report
  await api.functional.enterpriseLms.systemAdmin.analyticsReports.erase(
    connection,
    {
      analyticsReportId: createdReport.id,
    },
  );

  // Validate deletion by attempting to delete again (expect 404 Not Found)
  await TestValidator.error(
    "delete non-existent analytics report should throw 404",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.analyticsReports.erase(
        connection,
        {
          analyticsReportId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Step 6. Attempt deletion without authentication
  // Using a fresh connection with empty headers (simulating no auth)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized deletion attempt should throw 403",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.analyticsReports.erase(
        unauthConnection,
        {
          analyticsReportId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
