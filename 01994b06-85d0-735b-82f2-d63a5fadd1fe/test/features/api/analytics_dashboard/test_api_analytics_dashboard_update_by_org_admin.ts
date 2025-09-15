import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * End-to-end test to validate the update of a healthcare analytics dashboard by
 * an organization admin.
 *
 * Scenario Workflow:
 *
 * 1. Register & login as an organization admin
 * 2. Simulate dashboard creation (random structure - no create API exposed)
 * 3. Perform a successful update with valid fields (title, config_json,
 *    department, is_public), validate changes
 * 4. Attempt to update a non-existent dashboard (invalid dashboardId), expect
 *    error
 * 5. Attempt to assign an invalid department id, expect error
 * 6. RBAC: register/login as different org admin, attempt update, expect error
 */
export async function test_api_analytics_dashboard_update_by_org_admin(
  connection: api.IConnection,
) {
  // 1. Register org admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: adminPassword,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);

  // 2. Login as org admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Simulate dashboard creation (use random dashboard structure as initial data)
  const initialDashboard: IHealthcarePlatformAnalyticsDashboard =
    typia.random<IHealthcarePlatformAnalyticsDashboard>();
  // For test logic, assume admin is owner & org matches

  // Prepare update input
  const updatedTitle = RandomGenerator.paragraph({ sentences: 4 });
  const updatedConfig = JSON.stringify({
    layout: RandomGenerator.paragraph({ sentences: 10 }),
    widgets: [RandomGenerator.name()],
  });
  const newIsPublic = !initialDashboard.is_public;
  const updateReq = {
    title: updatedTitle,
    config_json: updatedConfig,
    department_id: initialDashboard.department_id,
    is_public: newIsPublic,
  } satisfies IHealthcarePlatformAnalyticsDashboard.IUpdate;

  // 4. Successful update
  const updated =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.update(
      connection,
      {
        dashboardId: initialDashboard.id,
        body: updateReq,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "dashboard is updated (title)",
    updated.title,
    updatedTitle,
  );
  TestValidator.equals(
    "dashboard config updated",
    updated.config_json,
    updatedConfig,
  );
  TestValidator.equals(
    "dashboard is_public updated",
    updated.is_public,
    newIsPublic,
  );
  TestValidator.notEquals(
    "updated_at field changed",
    updated.updated_at,
    initialDashboard.updated_at,
  );

  // 5. Non-existent dashboardId
  await TestValidator.error(
    "update fails on non-existent dashboardId",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.update(
        connection,
        {
          dashboardId: typia.random<string & tags.Format<"uuid">>(),
          body: updateReq,
        },
      );
    },
  );

  // 6. Assigning invalid department_id
  await TestValidator.error(
    "update fails on invalid department_id",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.update(
        connection,
        {
          dashboardId: initialDashboard.id,
          body: {
            ...updateReq,
            department_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );

  // 7. RBAC: use other admin
  const secondAdminEmail = typia.random<string & tags.Format<"email">>();
  const secondAdminPassword = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.organizationAdmin.join(connection, {
    body: {
      email: secondAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      password: secondAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
  });
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: secondAdminEmail,
      password: secondAdminPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await TestValidator.error(
    "RBAC - non-owner admin may not update dashboard",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.update(
        connection,
        {
          dashboardId: initialDashboard.id,
          body: updateReq,
        },
      );
    },
  );
}
