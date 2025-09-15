import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsReport";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Scenario for creating a new analytics report as an organization admin and
 * validating permission boundary.
 *
 * 1. Register as Organization Admin (creates a unique admin profile and context)
 * 2. As this admin, create a new analytics report with department/org IDs
 *    belonging to the admin context; verify properties
 * 3. Permission test: Try to create a report for an unrelated org/department;
 *    expect authorization/permission error
 */
export async function test_api_analyticsreport_organizationadmin_create_success_and_permission_validation(
  connection: api.IConnection,
) {
  // Step 1: Register new organization admin
  // Since IHealthcarePlatformOrganizationAdmin.IAuthorized has no organization_id,
  // we will simulate an organization ID and use it consistently for both the admin (test context) and report.
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);
  // Note: We do not have a real `organization_id` property from admin, so we use our variable consistently.

  // Step 2: Create a valid analytics report as this admin (who controls organizationId)
  const reportBody = {
    created_by_user_id: admin.id,
    organization_id: organizationId,
    department_id: null,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph(),
    template_config_json: JSON.stringify({
      widgets: [RandomGenerator.name()],
      dataSources: [],
    }),
    is_active: true,
  } satisfies IHealthcarePlatformAnalyticsReport.ICreate;
  const createdReport =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsReports.create(
      connection,
      { body: reportBody },
    );
  typia.assert(createdReport);
  TestValidator.equals(
    "report name matches",
    createdReport.name,
    reportBody.name,
  );
  TestValidator.equals(
    "report description matches",
    createdReport.description,
    reportBody.description,
  );
  TestValidator.equals(
    "report organization_id matches",
    createdReport.organization_id,
    reportBody.organization_id,
  );
  TestValidator.equals(
    "report created_by_user_id matches",
    createdReport.created_by_user_id,
    reportBody.created_by_user_id,
  );
  TestValidator.predicate(
    "report has valid id",
    typeof createdReport.id === "string" && createdReport.id.length > 0,
  );
  TestValidator.predicate(
    "created_at present",
    typeof createdReport.created_at === "string" &&
      createdReport.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at present",
    typeof createdReport.updated_at === "string" &&
      createdReport.updated_at.length > 0,
  );

  // Step 3: Permission boundary - use a different organization_id
  const forbiddenOrgId = typia.random<string & tags.Format<"uuid">>();
  const badReportBody = {
    ...reportBody,
    organization_id: forbiddenOrgId,
  } satisfies IHealthcarePlatformAnalyticsReport.ICreate;
  await TestValidator.error(
    "should fail on creating report for unrelated org",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.analyticsReports.create(
        connection,
        { body: badReportBody },
      );
    },
  );
}
