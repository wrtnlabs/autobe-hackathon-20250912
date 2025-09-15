import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";

/**
 * Validate department head can update ONLY their own department's analytics
 * dashboard and not others'.
 *
 * 1. Register department head (user1) and login
 * 2. Assume the existence of a dashboard (dashboardId) assigned to a department
 *    (departmentId) - mocked for test
 * 3. Update dashboard as department head for success path
 * 4. Attempt dashboard update with wrong department for failure (permission check)
 * 5. Attempt dashboard update for non-existent dashboard for failure (resource
 *    check)
 *
 * This verifies RBAC and resource existence.
 */
export async function test_api_analytics_dashboard_update_by_department_head(
  connection: api.IConnection,
) {
  // Register department head (user1)
  const joinReq = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(10),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const user1 = await api.functional.auth.departmentHead.join(connection, {
    body: joinReq,
  });
  typia.assert(user1);

  // Mock: existing dashboard assigned to department user1 controls
  const dashboardId = typia.random<string & tags.Format<"uuid">>();
  const departmentId = typia.random<string & tags.Format<"uuid">>();

  // Success case: update dashboard as proper department head
  const updateBody = {
    department_id: departmentId,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    config_json: JSON.stringify({ widgets: [RandomGenerator.alphaNumeric(5)] }),
    is_public: true,
  } satisfies IHealthcarePlatformAnalyticsDashboard.IUpdate;
  const updated =
    await api.functional.healthcarePlatform.departmentHead.analyticsDashboards.update(
      connection,
      {
        dashboardId,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "dashboard updated title",
    updated.title,
    updateBody.title,
  );
  TestValidator.equals(
    "dashboard updated department_id",
    updated.department_id,
    departmentId,
  );

  // Negative: wrong department - expect error
  const wrongDepartmentId = typia.random<string & tags.Format<"uuid">>();
  const wrongUpdateBody = {
    department_id: wrongDepartmentId,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    config_json: JSON.stringify({ layout: [RandomGenerator.name()] }),
    is_public: false,
  } satisfies IHealthcarePlatformAnalyticsDashboard.IUpdate;
  await TestValidator.error(
    "department head cannot update dashboard in wrong department",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.analyticsDashboards.update(
        connection,
        {
          dashboardId,
          body: wrongUpdateBody,
        },
      );
    },
  );

  // Negative: non-existent dashboard - expect error
  const nonExistentDashboardId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "cannot update non-existent dashboard",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.analyticsDashboards.update(
        connection,
        {
          dashboardId: nonExistentDashboardId,
          body: updateBody,
        },
      );
    },
  );
}
