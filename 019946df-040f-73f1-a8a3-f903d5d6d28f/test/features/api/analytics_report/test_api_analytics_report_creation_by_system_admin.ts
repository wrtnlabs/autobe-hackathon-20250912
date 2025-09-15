import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnalyticsReport";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * Validate the creation of analytics reports by a system admin user.
 *
 * This test covers registration and authentication of a system admin,
 * creation of a valid analytics report with all required fields, and
 * verification of the response with proper type and format assertions. It
 * also includes unauthorized access tests and invalid request validations.
 *
 * Steps:
 *
 * 1. Register a system admin user with valid credentials.
 * 2. Authenticate and obtain valid token.
 * 3. Create an analytics report with valid data including tenant ID, report
 *    name, type, JSON parameters, generation time, and content.
 * 4. Verify the response data types and values.
 * 5. Test unauthorized creation fail.
 * 6. Test invalid create request payloads fail.
 */
export async function test_api_analytics_report_creation_by_system_admin(
  connection: api.IConnection,
) {
  // Step 1: Register a system admin user with valid data
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const adminAuthorized = await api.functional.auth.systemAdmin.join(
    connection,
    {
      body: adminCreateBody,
    },
  );
  typia.assert(adminAuthorized);

  // Step 2: Prepare analytics report creation data
  const reportCreateBody = {
    tenant_id: adminAuthorized.tenant_id,
    report_name: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 7,
    }),
    report_type: typia.random<string>(),
    parameters_json: JSON.stringify({
      filter: { someKey: "value" },
      aggregation: "sum",
    }),
    generated_at: new Date().toISOString(),
    content_json: JSON.stringify({
      data: [1, 2, 3],
      metadata: { author: "unitTest" },
    }),
  } satisfies IEnterpriseLmsAnalyticsReport.ICreate;

  // Step 3: Create analytics report and validate response
  const analyticsReport =
    await api.functional.enterpriseLms.systemAdmin.analyticsReports.createAnalyticsReport(
      connection,
      { body: reportCreateBody },
    );
  typia.assert(analyticsReport);

  TestValidator.predicate(
    "analyticsReport.id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      analyticsReport.id,
    ),
  );
  TestValidator.equals(
    "analyticsReport.tenant_id matches",
    analyticsReport.tenant_id,
    reportCreateBody.tenant_id,
  );
  TestValidator.equals(
    "analyticsReport.report_name matches",
    analyticsReport.report_name,
    reportCreateBody.report_name,
  );
  TestValidator.equals(
    "analyticsReport.report_type matches",
    analyticsReport.report_type,
    reportCreateBody.report_type,
  );
  TestValidator.equals(
    "analyticsReport.parameters_json matches",
    analyticsReport.parameters_json,
    reportCreateBody.parameters_json,
  );
  TestValidator.equals(
    "analyticsReport.generated_at matches",
    analyticsReport.generated_at,
    reportCreateBody.generated_at,
  );
  TestValidator.equals(
    "analyticsReport.content_json matches",
    analyticsReport.content_json,
    reportCreateBody.content_json,
  );
  TestValidator.predicate(
    "analyticsReport.created_at is valid ISO date",
    !isNaN(Date.parse(analyticsReport.created_at)),
  );
  TestValidator.predicate(
    "analyticsReport.updated_at is valid ISO date",
    !isNaN(Date.parse(analyticsReport.updated_at)),
  );
  TestValidator.equals(
    "analyticsReport.deleted_at is null or undefined",
    analyticsReport.deleted_at ?? null,
    null,
  );

  // Step 4: Unauthorized connection test
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthorized creation should fail", async () => {
    await api.functional.enterpriseLms.systemAdmin.analyticsReports.createAnalyticsReport(
      unauthorizedConnection,
      { body: reportCreateBody },
    );
  });

  // Step 5: Test invalid payloads
  const invalidBodies: Partial<IEnterpriseLmsAnalyticsReport.ICreate>[] = [
    { ...reportCreateBody, report_name: "" },
    { ...reportCreateBody, parameters_json: "not a valid json string" },
    { ...reportCreateBody, content_json: "{" },
    { ...reportCreateBody, tenant_id: "invalid-uuid" },
  ];

  for (const invalidBody of invalidBodies) {
    await TestValidator.error(
      `invalid request should be rejected: ${JSON.stringify(invalidBody)}`,
      async () => {
        await api.functional.enterpriseLms.systemAdmin.analyticsReports.createAnalyticsReport(
          connection,
          {
            body: invalidBody as IEnterpriseLmsAnalyticsReport.ICreate,
          },
        );
      },
    );
  }
}
