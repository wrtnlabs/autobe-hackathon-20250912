import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnalyticsReport";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";

/**
 * Test the complete creation process for an analytics report by a content
 * creator or instructor user in an enterprise LMS.
 *
 * The test covers authenticating the content creator/instructor user,
 * preparing a valid analytics report creation payload, invoking the
 * createAnalyticsReport API, and validating the response data integrity
 * including tenant association and fields. It also includes negative tests
 * attempting to create reports with invalid types or missing required
 * fields, ensuring validation and authorization logic are correctly
 * enforced.
 *
 * This comprehensive test asserts that the analytics report creation
 * endpoint behaves correctly both in success and failure scenarios.
 */
export async function test_api_content_creator_analytics_report_creation_success(
  connection: api.IConnection,
) {
  // 1. Authenticate content creator/instructor user by joining
  const passwordHash = RandomGenerator.alphaNumeric(32);
  const joinBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: passwordHash,
    first_name: RandomGenerator.name(2),
    last_name: RandomGenerator.name(2),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const authorized: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Use the returned tenant_id for report creation
  const { tenant_id } = authorized;

  // 3. Prepare a valid analytics report creation payload
  const nowISOString = new Date().toISOString();
  const parametersObj = {
    filter: { status: "completed" },
    aggregation: { type: "count" },
  };
  const contentObj = {
    summary: "This report summarizes course completions.",
    details: [{ courseId: "123", completions: 42 }],
  };
  const createReportBody = {
    tenant_id,
    report_name: `Course Completion Report - ${RandomGenerator.paragraph({ sentences: 3 })}`,
    report_type: "completion",
    parameters_json: JSON.stringify(parametersObj),
    generated_at: nowISOString,
    content_json: JSON.stringify(contentObj),
  } satisfies IEnterpriseLmsAnalyticsReport.ICreate;

  // 4. Call the createAnalyticsReport API to create the report
  const report: IEnterpriseLmsAnalyticsReport =
    await api.functional.enterpriseLms.contentCreatorInstructor.analyticsReports.createAnalyticsReport(
      connection,
      {
        body: createReportBody,
      },
    );
  typia.assert(report);

  // 5. Validate the report response fields and tenant_id match
  TestValidator.equals(
    "tenant_id matches authenticated user's tenant",
    report.tenant_id,
    tenant_id,
  );
  TestValidator.equals(
    "report_name matches input",
    report.report_name,
    createReportBody.report_name,
  );
  TestValidator.equals(
    "report_type matches input",
    report.report_type,
    createReportBody.report_type,
  );
  TestValidator.equals(
    "parameters_json matches input",
    report.parameters_json,
    createReportBody.parameters_json,
  );
  TestValidator.equals(
    "content_json matches input",
    report.content_json,
    createReportBody.content_json,
  );

  // 6. Attempt to create report with invalid report_type - expect error
  const invalidReportTypeBody = {
    ...createReportBody,
    report_type: "invalid_report_type",
  } satisfies IEnterpriseLmsAnalyticsReport.ICreate;
  await TestValidator.error(
    "should reject creation with invalid report_type",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.analyticsReports.createAnalyticsReport(
        connection,
        {
          body: invalidReportTypeBody,
        },
      );
    },
  );

  // 7. Attempt to create report missing required field report_name - expect error
  // Since report_name is required, omit it by creating a body without report_name
  // but to avoid TypeScript error, construct a partial object and cast properly
  const incompleteReportBody = {
    tenant_id,
    report_type: "completion",
    parameters_json: JSON.stringify(parametersObj),
    generated_at: nowISOString,
    content_json: JSON.stringify(contentObj),
  } satisfies Omit<IEnterpriseLmsAnalyticsReport.ICreate, "report_name"> &
    Partial<IEnterpriseLmsAnalyticsReport.ICreate>;

  await TestValidator.error(
    "should reject creation with missing report_name",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.analyticsReports.createAnalyticsReport(
        connection,
        {
          // Force cast with only partial because report_name is missing
          // This is safe only in test for error validation
          body: incompleteReportBody as any,
        },
      );
    },
  );

  // 8. Attempt unauthorized creation (simulate with no join/auth token)
  // Create a separate unauthenticated connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "should reject unauthorized creation attempt",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.analyticsReports.createAnalyticsReport(
        unauthenticatedConnection,
        {
          body: createReportBody,
        },
      );
    },
  );
}
