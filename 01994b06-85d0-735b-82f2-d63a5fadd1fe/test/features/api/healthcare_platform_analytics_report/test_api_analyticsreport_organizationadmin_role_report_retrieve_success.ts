import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsReport";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * End-to-end scenario for organization admin retrieving the details of a
 * specific analytics report.
 *
 * Steps:
 *
 * 1. Register and login as organization admin.
 * 2. Create an analytics report under the current organization.
 * 3. Retrieve with GET using correct reportId.
 * 4. Validate all details match what was created.
 * 5. Edge: Another admin tries to retrieve, expect permission denied.
 */
export async function test_api_analyticsreport_organizationadmin_role_report_retrieve_success(
  connection: api.IConnection,
) {
  // 1. Register & login as organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const admin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create new analytics report (using admin's org/user id)
  const reportBody = {
    created_by_user_id: admin.id,
    organization_id: admin.id, // For test; usually admin.id is unique to org
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    template_config_json: JSON.stringify({ fields: ["foo"] }),
    is_active: true,
  } satisfies IHealthcarePlatformAnalyticsReport.ICreate;
  const created: IHealthcarePlatformAnalyticsReport =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsReports.create(
      connection,
      { body: reportBody },
    );
  typia.assert(created);

  // 3. Retrieve report by reportId
  const fetched: IHealthcarePlatformAnalyticsReport =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsReports.at(
      connection,
      { reportId: created.id },
    );
  typia.assert(fetched);

  // 4. Validate details
  TestValidator.equals("report id", fetched.id, created.id);
  TestValidator.equals(
    "created_by_user_id",
    fetched.created_by_user_id,
    admin.id,
  );
  TestValidator.equals(
    "organization_id",
    fetched.organization_id,
    created.organization_id,
  );
  TestValidator.equals("name", fetched.name, reportBody.name);
  TestValidator.equals(
    "description",
    fetched.description,
    reportBody.description,
  );
  TestValidator.equals(
    "template_config_json",
    fetched.template_config_json,
    reportBody.template_config_json,
  );
  TestValidator.equals("is_active", fetched.is_active, true);

  // 5. Edge: Another admin, new org, tries to fetch, fail expected
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherAdminPassword = RandomGenerator.alphaNumeric(10);
  const otherAdmin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: otherEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: otherAdminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(otherAdmin);
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: otherEmail,
      password: otherAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  await TestValidator.error(
    "permission denied for report from another organization",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.analyticsReports.at(
        connection,
        { reportId: created.id },
      );
    },
  );
}
