import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnalyticsReport";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * Test the retrieval of a detailed analytics report by its valid unique
 * identifier.
 *
 * This test performs a complete flow ensuring the system administrator role
 * is properly authenticated, a new analytics report is created, and then
 * retrieved successfully by its ID. The test validates that the retrieved
 * report's properties match exactly what was created, confirming correct
 * persistence and access control.
 *
 * Steps:
 *
 * 1. Register a new system administrator using /auth/systemAdmin/join.
 * 2. Log in as the newly registered system administrator.
 * 3. Create a new analytics report with valid realistic data.
 * 4. Retrieve the analytics report by its generated ID.
 * 5. Assert all report fields match the created data.
 * 6. Validate authentication token presence and tenant consistency.
 *
 * This ensures full coverage of authentication, creation, and retrieval
 * functionality as expected in Enterprise LMS system.
 */
export async function test_api_analytics_report_retrieval_with_valid_id(
  connection: api.IConnection,
) {
  // 1. Register a new system administrator
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const admin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: createBody,
    });
  typia.assert(admin);

  // 2. Log in as the created system administrator
  const loginBody = {
    email: createBody.email,
    password_hash: createBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const loggedInAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  // Ensure token is set by the login function for further calls
  TestValidator.predicate(
    "access token is set",
    typeof loggedInAdmin.token.access === "string" &&
      loggedInAdmin.token.access.length > 0,
  );

  // 3. Create a new analytics report with tenantId from admin
  const nowISOString = new Date().toISOString();
  const reportBody = {
    tenant_id: admin.tenant_id,
    report_name: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    report_type: RandomGenerator.pick([
      "completion",
      "engagement",
      "compliance",
    ] as const),
    parameters_json: JSON.stringify({
      filters: { dateRange: ["2024-01-01", "2024-06-30"] },
      aggregation: "monthly",
    }),
    generated_at: nowISOString,
    content_json: JSON.stringify({
      data: ArrayUtil.repeat(3, () => ({
        metric: RandomGenerator.name(1),
        value: Math.random() * 100,
      })),
    }),
  } satisfies IEnterpriseLmsAnalyticsReport.ICreate;

  const createdReport: IEnterpriseLmsAnalyticsReport =
    await api.functional.enterpriseLms.systemAdmin.analyticsReports.createAnalyticsReport(
      connection,
      { body: reportBody },
    );
  typia.assert(createdReport);

  // 4. Retrieve the analytics report by its ID
  const retrievedReport: IEnterpriseLmsAnalyticsReport =
    await api.functional.enterpriseLms.systemAdmin.analyticsReports.atAnalyticsReport(
      connection,
      { analyticsReportId: createdReport.id },
    );
  typia.assert(retrievedReport);

  // 5. Assert all key fields match
  TestValidator.equals(
    "tenant_id matches",
    retrievedReport.tenant_id,
    createdReport.tenant_id,
  );
  TestValidator.equals(
    "report_name matches",
    retrievedReport.report_name,
    createdReport.report_name,
  );
  TestValidator.equals(
    "report_type matches",
    retrievedReport.report_type,
    createdReport.report_type,
  );
  TestValidator.equals(
    "parameters_json matches",
    retrievedReport.parameters_json,
    createdReport.parameters_json,
  );
  TestValidator.equals(
    "generated_at matches",
    retrievedReport.generated_at,
    createdReport.generated_at,
  );
  TestValidator.equals(
    "content_json matches",
    retrievedReport.content_json,
    createdReport.content_json,
  );
  TestValidator.equals(
    "created_at is defined",
    typeof retrievedReport.created_at === "string",
    true,
  );
  TestValidator.equals(
    "updated_at is defined",
    typeof retrievedReport.updated_at === "string",
    true,
  );

  // 6. Confirm that deleted_at is null or undefined (active record)
  TestValidator.predicate(
    "deleted_at is null or undefined",
    retrievedReport.deleted_at === null ||
      retrievedReport.deleted_at === undefined,
  );
}
