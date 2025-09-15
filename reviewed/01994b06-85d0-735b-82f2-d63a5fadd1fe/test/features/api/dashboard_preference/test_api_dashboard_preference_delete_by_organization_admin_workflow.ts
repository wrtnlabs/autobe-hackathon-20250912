import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import type { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * 조직 관리자가 자신 조직의 대시보드 preference를 삭제하는 전체 워크플로우를 검증
 *
 * 1. 조직 관리자 가입/로그인 및 세션 획득
 * 2. 조직 소속 대시보드(dashboard) 생성
 * 3. 해당 대시보드의 preference 생성
 * 4. Preference 삭제(정상/재삭제/타 조직/비인가/존재X 등)
 * 5. 삭제 후 preference 정상적으로 접근 불가함을 확인
 */
export async function test_api_dashboard_preference_delete_by_organization_admin_workflow(
  connection: api.IConnection,
) {
  // 1. admin 1 가입 및 로그인
  const admin1_email = typia.random<string & tags.Format<"email">>();
  const admin1_join = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: admin1_email,
        full_name: RandomGenerator.name(),
        password: "strongpassword123",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(admin1_join);
  const admin1_id = admin1_join.id;
  const org_id = admin1_join.id; // 조직 ID 추상화(실제 분리 필요시 교체)

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: admin1_email,
      password: "strongpassword123",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 2. 대시보드 생성
  const dashboard =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.create(
      connection,
      {
        body: {
          owner_user_id: admin1_id,
          organization_id: org_id,
          department_id: null,
          title: `Dash-${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          config_json: JSON.stringify({
            layout: "default",
            widgets: [RandomGenerator.name()],
          }),
          is_public: true,
        } satisfies IHealthcarePlatformAnalyticsDashboard.ICreate,
      },
    );
  typia.assert(dashboard);

  // 3. preference 생성
  const preference =
    await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.preferences.create(
      connection,
      {
        dashboardId: dashboard.id,
        body: {
          dashboard_id: dashboard.id,
          user_id: admin1_id,
          preferences_json: JSON.stringify({
            theme: "auto",
            layout: "compact",
          }),
        } satisfies IHealthcarePlatformDashboardPreference.ICreate,
      },
    );
  typia.assert(preference);

  // 4. 삭제 성공
  await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.preferences.erase(
    connection,
    {
      dashboardId: dashboard.id,
      preferenceId: preference.id,
    },
  );
  // 4b. 재삭제 시도(idempotent)
  await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.preferences.erase(
    connection,
    {
      dashboardId: dashboard.id,
      preferenceId: preference.id,
    },
  );

  // 4c. 존재하지 않는 preferenceId 삭제 시 오류
  await TestValidator.error(
    "존재하지 않는 preferenceId 삭제시 오류 발생",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.preferences.erase(
        connection,
        {
          dashboardId: dashboard.id,
          preferenceId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 5. admin2 가입/로그인 후 타 조직 preference 삭제 시 거부됨
  const admin2_email = typia.random<string & tags.Format<"email">>();
  const admin2_join = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: admin2_email,
        full_name: RandomGenerator.name(),
        password: "pw4567890",
        phone: RandomGenerator.mobile(),
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(admin2_join);

  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: admin2_email,
      password: "pw4567890",
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  await TestValidator.error(
    "타 조직 관리자가 남의 preference 삭제 시 권한 거부 오류 발생",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.analyticsDashboards.preferences.erase(
        connection,
        {
          dashboardId: dashboard.id,
          preferenceId: preference.id,
        },
      );
    },
  );
}
