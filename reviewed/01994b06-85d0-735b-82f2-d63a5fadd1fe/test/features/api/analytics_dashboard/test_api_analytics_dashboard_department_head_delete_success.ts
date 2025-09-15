import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validates analytics dashboard deletion by a department head.
 *
 * This test covers the process where a department head registers, logs in,
 * creates a dashboard (using the organization admin API, but as department head
 * owner), then deletes it using their authorization. It then ensures the delete
 * endpoint succeeds without exceptions.
 *
 * 1. Department head registers and logs in (saving id/token etc.)
 * 2. Department head creates an analytics dashboard where they are the owner.
 * 3. Department head deletes the dashboard.
 * 4. Validate that no errors occur and API responds successfully.
 * 5. (Audit log and post-delete listing/tests skipped as endpoints are not
 *    present.)
 */
export async function test_api_analytics_dashboard_department_head_delete_success(
  connection: api.IConnection,
) {
  // Step 1: Register and log in as department head
  const headEmail = typia.random<string & tags.Format<"email">>();
  const headPassword = RandomGenerator.alphaNumeric(12);
  const joinHead = await api.functional.auth.departmentHead.join(connection, {
    body: {
      email: headEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      password: headPassword,
    } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest,
  });
  typia.assert(joinHead);
  // Switch token context by logging in explicitly
  await api.functional.auth.departmentHead.login(connection, {
    body: {
      email: headEmail,
      password: headPassword,
    } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest,
  });

  // Step 2: Department head creates an analytics dashboard as owner (using org admin API)
  const dashboardCreateBody = {
    owner_user_id: joinHead.id,
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    department_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph(),
    config_json: JSON.stringify({ widgets: [RandomGenerator.name(1)] }),
    is_public: true,
  } satisfies IHealthcarePlatformAnalyticsDashboard.ICreate;
  const dashboard =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.create(
      connection,
      {
        body: dashboardCreateBody,
      },
    );
  typia.assert(dashboard);

  // Step 3: Department head deletes the dashboard
  await api.functional.healthcarePlatform.departmentHead.analyticsDashboards.erase(
    connection,
    {
      dashboardId: dashboard.id,
    },
  );
}
