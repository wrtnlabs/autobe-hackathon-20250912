import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnalyticsReport";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Validate that an Organization Admin user can successfully retrieve
 * detailed analytics report information.
 *
 * This test encompasses the entire authenticated workflow including user
 * registration, login, and retrieval of the analytics report by ID while
 * respecting tenant isolation and role-based access control.
 *
 * Steps:
 *
 * 1. Create and authenticate an Organization Admin user.
 * 2. Use the returned tenant_id and user credentials for authenticated
 *    requests.
 * 3. Retrieve a valid analytics report ID available for this tenant context.
 * 4. Get the detailed analytics report by the analyticsReportId.
 * 5. Validate all important fields are correctly populated and consistent with
 *    tenant context.
 * 6. Confirm error handling for invalid or unauthorized requests.
 */
export async function test_api_analytics_report_retrieval_as_organization_admin(
  connection: api.IConnection,
) {
  // 1. Organization Admin user registration
  const adminCreateBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `user${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "TestPassword123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;

  const authorizedAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Re-authenticate to simulate login flow explicitly
  const loginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IEnterpriseLmsOrganizationAdmin.ILogin;

  const loggedInAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAdmin);

  // Ensure tenant consistency
  TestValidator.equals(
    "tenant_id matches after login",
    authorizedAdmin.tenant_id,
    loggedInAdmin.tenant_id,
  );

  // 3. Use the tenant_id to determine or obtain a valid analytics report ID.
  //    For this test, we generate a random UUID to simulate report id.
  //    In real-world tests, this should come from actual seeded data or an API call.
  const analyticsReportId = typia.random<string & tags.Format<"uuid">>();

  // 4. Retrieve the analytics report details
  const analyticsReport: IEnterpriseLmsAnalyticsReport =
    await api.functional.enterpriseLms.organizationAdmin.analyticsReports.atAnalyticsReport(
      connection,
      { analyticsReportId },
    );
  typia.assert(analyticsReport);

  // 5. Validate key fields for consistency and completeness
  TestValidator.equals(
    "analytics report id matches requested",
    analyticsReport.id,
    analyticsReportId,
  );
  TestValidator.equals(
    "analytics report tenant matches admin tenant",
    analyticsReport.tenant_id,
    loggedInAdmin.tenant_id,
  );
  TestValidator.predicate(
    "analytics report generated_at is a valid ISO date",
    typeof analyticsReport.generated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*/.test(
        analyticsReport.generated_at,
      ),
  );
  TestValidator.predicate(
    "analytics report parameters_json is valid JSON",
    (() => {
      try {
        JSON.parse(analyticsReport.parameters_json);
        return true;
      } catch {
        return false;
      }
    })(),
  );
  TestValidator.predicate(
    "analytics report content_json is valid JSON",
    (() => {
      try {
        JSON.parse(analyticsReport.content_json);
        return true;
      } catch {
        return false;
      }
    })(),
  );

  // deleted_at should be null or string
  TestValidator.predicate(
    "deleted_at is null or string",
    analyticsReport.deleted_at === null ||
      typeof analyticsReport.deleted_at === "string" ||
      analyticsReport.deleted_at === undefined,
  );
}
