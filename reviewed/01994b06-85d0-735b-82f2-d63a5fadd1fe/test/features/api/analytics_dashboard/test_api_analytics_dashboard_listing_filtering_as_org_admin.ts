import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAnalyticsDashboard";

/**
 * End-to-end test for organization-admin analytics dashboard filtering and RBAC
 * in a healthcare platform
 *
 * Steps:
 *
 * 1. Register and login as organization-admin (unique email/name)
 * 2. Create multiple dashboards (different departments, plus org/global level)
 * 3. List dashboards unfiltered (expect all org dashboards)
 * 4. List dashboards filtered by department (expect only that department's
 *    dashboards)
 * 5. List dashboards filtered by owner
 * 6. List dashboards with a non-existent department
 * 7. List dashboards with high page number (should get empty list)
 * 8. Attempt listing without/with invalid auth (should fail with error)
 */
export async function test_api_analytics_dashboard_listing_filtering_as_org_admin(
  connection: api.IConnection,
) {
  // 1. Register & login as org admin (get admin and access token)
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: "1234",
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinInput,
  });
  typia.assert(admin);
  const adminToken = admin.token.access;
  const organizationId = admin.id; // Assume admin.id == organization context for create (deduce from returned admin object)
  const ownerUserId = admin.id;

  // 2. Create dashboards (two in different departments/owners, one global)
  const departmentIdA = typia.random<string & tags.Format<"uuid">>();
  const departmentIdB = typia.random<string & tags.Format<"uuid">>();
  const dashboards: IHealthcarePlatformAnalyticsDashboard[] = [];
  for (const departmentId of [departmentIdA, departmentIdB, null]) {
    const createInput = {
      owner_user_id: ownerUserId,
      organization_id: organizationId,
      department_id: departmentId,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      config_json: JSON.stringify({
        layout: "default",
        widgets: [RandomGenerator.name()],
      }),
      is_public: Math.random() > 0.5,
      description: RandomGenerator.paragraph({ sentences: 6 }),
    } satisfies IHealthcarePlatformAnalyticsDashboard.ICreate;
    const dashboard =
      await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.create(
        connection,
        { body: createInput },
      );
    typia.assert(dashboard);
    dashboards.push(dashboard);
  }

  // 3. List dashboards with no filters (should include all created)
  const allList =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.index(
      connection,
      { body: {} },
    );
  typia.assert(allList);
  const allIds = dashboards.map((d) => d.id);
  for (const item of allList.data) {
    TestValidator.predicate(
      "id belongs to created dashboards or proper org",
      allIds.includes(item.id),
    );
    TestValidator.equals(
      "organization matches",
      item.organization_id,
      organizationId,
    );
  }

  // 4. List with department filter (should only get that department's dashboards)
  const byDept =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.index(
      connection,
      { body: { department_id: departmentIdA } },
    );
  typia.assert(byDept);
  for (const item of byDept.data) {
    TestValidator.equals(
      "matches department filter",
      item.department_id,
      departmentIdA,
    );
  }

  // 5. By owner
  const byOwner =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.index(
      connection,
      { body: { owner_user_id: ownerUserId } },
    );
  typia.assert(byOwner);
  for (const item of byOwner.data) {
    TestValidator.equals(
      "matches owner filter",
      item.owner_user_id,
      ownerUserId,
    );
  }

  // 6. By non-existent department
  const fakeDeptId = typia.random<string & tags.Format<"uuid">>();
  const byFakeDept =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.index(
      connection,
      { body: { department_id: fakeDeptId } },
    );
  typia.assert(byFakeDept);
  TestValidator.equals(
    "no dashboards for fake department",
    byFakeDept.data.length,
    0,
  );

  // 7. High page number
  const highPage =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.index(
      connection,
      { body: { page: 999 } },
    );
  typia.assert(highPage);
  TestValidator.equals("empty result for high page", highPage.data.length, 0);

  // 8. Unauthenticated (empty headers)
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated org admin dashboard list fails",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.index(
        unauthConn,
        { body: {} },
      );
    },
  );
}
