import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnalyticsReport";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";

/**
 * Validates retrieving an analytics report by ID for a content
 * creator/instructor.
 *
 * This test covers:
 *
 * - Registering a new content creator/instructor user with all required
 *   details.
 * - Logging in the user to obtain authentication tokens.
 * - Creating a new analytics report with realistic data tied to the user's
 *   tenant.
 * - Retrieving the created analytics report by its ID and verifying the
 *   returned data matches exactly.
 * - Testing error cases including invalid ID format, non-existent report ID,
 *   and unauthorized access.
 *
 * All steps ensure strict type safety, complete required property
 * inclusion, and format compliance.
 *
 * @param connection API connection for making requests
 */
export async function test_api_analytics_report_retrieval_content_creator_instructor_context(
  connection: api.IConnection,
) {
  // 1. Register content creator instructor user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const passwordPlain = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    tenant_id: tenantId,
    email: `creator-${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: passwordPlain,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;
  const joinedUser = await api.functional.auth.contentCreatorInstructor.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert(joinedUser);

  // 2. Login content creator instructor user
  const loginBody = {
    email: joinBody.email,
    password: passwordPlain,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;
  const loggedInUser = await api.functional.auth.contentCreatorInstructor.login(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(loggedInUser);

  // 3. Create analytics report
  const reportCreateBody = {
    tenant_id: joinBody.tenant_id,
    report_name: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
    report_type: RandomGenerator.pick([
      "completion",
      "engagement",
      "compliance",
    ] as const),
    parameters_json: JSON.stringify({ filter: "all", aggregation: "monthly" }),
    generated_at: new Date().toISOString(),
    content_json: JSON.stringify({ data: [1, 2, 3], meta: { version: 1 } }),
  } satisfies IEnterpriseLmsAnalyticsReport.ICreate;
  const createdReport =
    await api.functional.enterpriseLms.contentCreatorInstructor.analyticsReports.createAnalyticsReport(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(createdReport);

  // 4. Retrieve analytics report by ID
  const retrievedReport =
    await api.functional.enterpriseLms.contentCreatorInstructor.analyticsReports.atAnalyticsReport(
      connection,
      {
        analyticsReportId: createdReport.id,
      },
    );
  typia.assert(retrievedReport);

  // Validate retrieved report data matches the created report
  TestValidator.equals(
    "retrieved analytics report matches created",
    retrievedReport,
    createdReport,
  );

  // 5. Negative test: invalid ID format
  await TestValidator.error(
    "invalid analyticsReportId format should fail",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.analyticsReports.atAnalyticsReport(
        connection,
        {
          analyticsReportId: "invalid-uuid-format",
        },
      );
    },
  );

  // 6. Negative test: non-existent UUID
  const nonExistentUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent analyticsReportId should fail",
    async () => {
      await api.functional.enterpriseLms.contentCreatorInstructor.analyticsReports.atAnalyticsReport(
        connection,
        {
          analyticsReportId: nonExistentUuid,
        },
      );
    },
  );

  // 7. Negative test: unauthorized access (clear authorization token)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.enterpriseLms.contentCreatorInstructor.analyticsReports.atAnalyticsReport(
      unauthConnection,
      {
        analyticsReportId: createdReport.id,
      },
    );
  });
}
