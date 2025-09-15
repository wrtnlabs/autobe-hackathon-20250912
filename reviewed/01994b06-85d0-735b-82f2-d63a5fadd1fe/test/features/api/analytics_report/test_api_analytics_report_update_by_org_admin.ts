import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsReport";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate organization admin can update analytics reports, with full business
 * logic and permission boundaries, covering both success and negative scenarios
 * as follows:
 *
 * 1. Join & login as organization admin (Admin A)
 * 2. Admin A creates an analytics report in their organization
 * 3. Admin A successfully updates the report, fields are changed and validated
 * 4. Another admin (Admin B, different org) cannot update the report (permission
 *    error)
 * 5. Attempt updating a non-existent report (no effect, error expected)
 * 6. Invalid update (malformed JSON in config) causes a runtime error (if API
 *    validation)
 * 7. After all negative cases, confirm the report state remains correct via Admin
 *    A (the authorized org admin).
 * 8. (If audit log API available elsewhere, confirm audit event - not implemented
 *    here)
 *
 * All steps use only allowed DTO fields and follow system-provided
 * constraints/rules.
 */
export async function test_api_analytics_report_update_by_org_admin(
  connection: api.IConnection,
) {
  // 1. Join & login as organization admin (Admin A)
  const adminA_email = typia.random<string & tags.Format<"email">>();
  const orgA_id = typia.random<string & tags.Format<"uuid">>();
  const adminA: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: adminA_email,
        full_name: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(adminA);

  // 2. Admin A creates analytics report in their organization
  const departmentA_id = typia.random<string & tags.Format<"uuid">>();
  const reportCreate = {
    created_by_user_id: adminA.id,
    organization_id: orgA_id,
    department_id: departmentA_id,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    template_config_json: JSON.stringify({ widgets: [], filters: [] }),
    is_active: true,
  } satisfies IHealthcarePlatformAnalyticsReport.ICreate;
  const report: IHealthcarePlatformAnalyticsReport =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsReports.create(
      connection,
      {
        body: reportCreate,
      },
    );
  typia.assert(report);

  // 3. Admin A updates the report successfully
  const updateFields = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    template_config_json: JSON.stringify({
      widgets: [{ id: 123 }],
      info: "updated",
    }),
    is_active: false,
    department_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IHealthcarePlatformAnalyticsReport.IUpdate;
  const updated: IHealthcarePlatformAnalyticsReport =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsReports.update(
      connection,
      {
        reportId: report.id,
        body: updateFields,
      },
    );
  typia.assert(updated);
  TestValidator.equals("report update acknowledged", updated.id, report.id);
  TestValidator.equals("report name updated", updated.name, updateFields.name);
  TestValidator.equals(
    "template config updated",
    updated.template_config_json,
    updateFields.template_config_json,
  );

  // 4. Another org admin attempts to update the report (should fail - permission denied)
  const orgB_id = typia.random<string & tags.Format<"uuid">>();
  const adminB_email = typia.random<string & tags.Format<"email">>();
  const adminB: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        email: adminB_email,
        full_name: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    });
  typia.assert(adminB);

  // Authenticate as Admin B (different org)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminB_email,
      password: "",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  await TestValidator.error(
    "update from different org admin should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.analyticsReports.update(
        connection,
        {
          reportId: report.id,
          body: {
            description: "malicious_change",
          } satisfies IHealthcarePlatformAnalyticsReport.IUpdate,
        },
      );
    },
  );

  // 5. Update with non-existent reportId - should fail
  await TestValidator.error(
    "update with non-existent reportId should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.analyticsReports.update(
        connection,
        {
          reportId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            name: "ghost_update",
          } satisfies IHealthcarePlatformAnalyticsReport.IUpdate,
        },
      );
    },
  );

  // 6. Invalid update (malformed JSON in template_config_json)
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminA_email,
      password: "",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await TestValidator.error(
    "malformed JSON in template_config_json should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.analyticsReports.update(
        connection,
        {
          reportId: report.id,
          body: {
            template_config_json: "{not:valid:json", // not a valid JSON string
          } satisfies IHealthcarePlatformAnalyticsReport.IUpdate,
        },
      );
    },
  );

  // 7. State unchanged after failed updates: confirm report via Admin A
  const refetched: IHealthcarePlatformAnalyticsReport =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsReports.update(
      connection,
      {
        reportId: report.id,
        body: {} satisfies IHealthcarePlatformAnalyticsReport.IUpdate,
      },
    );
  typia.assert(refetched);
  TestValidator.equals(
    "report NOT modified by failed attacks",
    refetched.name,
    updateFields.name,
  );
  TestValidator.equals(
    "report NOT changed in template_config_json",
    refetched.template_config_json,
    updateFields.template_config_json,
  );
}
