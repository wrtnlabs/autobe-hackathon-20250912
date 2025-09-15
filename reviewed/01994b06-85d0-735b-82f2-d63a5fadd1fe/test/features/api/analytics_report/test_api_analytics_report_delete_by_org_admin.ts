import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsReport";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate hard delete of an analytics report by authorized organization
 * admin, including error checks for delete by another organization's admin
 * and by repeated/invalid report IDs.
 *
 * Workflow:
 *
 * 1. Register & login as org admin A (primary org)
 * 2. Create analytics report as org admin A
 * 3. Delete analytics report (success: hard delete)
 * 4. Attempt to delete same report again (should succeed idempotently or
 *    produce meaningful error)
 * 5. Register & login as org admin B (different org)
 * 6. Attempt to delete report as org admin B (should fail with authorization
 *    error)
 */
export async function test_api_analytics_report_delete_by_org_admin(
  connection: api.IConnection,
) {
  // 1. Register & login as org admin A
  const orgAdminAEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminA = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminAEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "Strong!P@ssw0rd#A",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminA);

  // 2. Create analytics report as org admin A
  const analyticsReport =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsReports.create(
      connection,
      {
        body: {
          created_by_user_id: orgAdminA.id,
          organization_id: orgAdminA.id, // NOTE: This should be actual organization ID if available; here, treat orgAdmin id as unique test org
          department_id: null,
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph(),
          template_config_json: JSON.stringify({ test: true }),
          is_active: true,
        } satisfies IHealthcarePlatformAnalyticsReport.ICreate,
      },
    );
  typia.assert(analyticsReport);

  // 3. Delete analytics report (success: hard delete)
  await api.functional.healthcarePlatform.organizationAdmin.analyticsReports.erase(
    connection,
    {
      reportId: analyticsReport.id,
    },
  );

  // 4. Attempt to delete again (should be idempotent or meaningful error)
  await TestValidator.error(
    "Deleting already-deleted analytics report should be idempotent or error",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.analyticsReports.erase(
        connection,
        {
          reportId: analyticsReport.id,
        },
      );
    },
  );

  // 5. Register & login as org admin B (different org)
  const orgAdminBEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminB = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminBEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: "Strong!P@ssw0rd#B",
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminB);

  // 6. Attempt to delete as non-owning org admin (should error with authorization error)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminB.email,
      password: "Strong!P@ssw0rd#B",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  await TestValidator.error(
    "Unauthorized org admin should not delete another org's report",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.analyticsReports.erase(
        connection,
        {
          reportId: analyticsReport.id,
        },
      );
    },
  );

  // Bonus: Attempt to delete a completely random non-existent reportId
  await TestValidator.error(
    "Deleting completely non-existent analytics report",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.analyticsReports.erase(
        connection,
        {
          reportId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
