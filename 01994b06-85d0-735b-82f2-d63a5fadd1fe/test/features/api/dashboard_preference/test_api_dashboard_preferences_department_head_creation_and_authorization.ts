import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import type { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";

/**
 * Validate the creation and authorization of dashboard preferences by a
 * department head.
 *
 * 1. Register a new department head and log in.
 * 2. Create dashboard preferences for an analytics dashboard.
 * 3. Assert success of creation and field correctness.
 * 4. Attempt invalid preference creations: with schema-violating preferences,
 *    impersonated user_id, or dashboard out of scope.
 * 5. Validate business/audit trail fields and errors.
 */
export async function test_api_dashboard_preferences_department_head_creation_and_authorization(
  connection: api.IConnection,
) {
  // 1. Register a department head
  const headEmail: string = typia.random<string & tags.Format<"email">>();
  const headPassword: string = RandomGenerator.alphaNumeric(10);
  const joinReq = {
    email: headEmail,
    full_name: RandomGenerator.name(),
    password: headPassword,
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const headAuth: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.join(connection, {
      body: joinReq,
    });
  typia.assert(headAuth);

  // 2. Login as department head (explicit for session)
  const loginReq = {
    email: headEmail,
    password: headPassword,
  } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest;
  const loginResp: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.login(connection, {
      body: loginReq,
    });
  typia.assert(loginResp);

  // 3. Create dashboard preference as the logged-in department head
  const dashboardId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const preferenceBody = {
    dashboard_id: dashboardId,
    user_id: loginResp.id,
    preferences_json: JSON.stringify({
      theme: RandomGenerator.pick(["light", "dark"] as const),
      layout: RandomGenerator.pick(["grid", "list"] as const),
      widgets: [RandomGenerator.name(2)],
    }),
  } satisfies IHealthcarePlatformDashboardPreference.ICreate;
  const createdPref: IHealthcarePlatformDashboardPreference =
    await api.functional.healthcarePlatform.departmentHead.analyticsDashboards.preferences.create(
      connection,
      { dashboardId, body: preferenceBody },
    );
  typia.assert(createdPref);
  TestValidator.equals(
    "dashboard_id matches",
    createdPref.dashboard_id,
    dashboardId,
  );
  TestValidator.equals("user_id matches", createdPref.user_id, loginResp.id);
  TestValidator.predicate(
    "created_at is ISO date",
    typeof createdPref.created_at === "string" &&
      createdPref.created_at.endsWith("Z"),
  );
  TestValidator.predicate(
    "updated_at is ISO date",
    typeof createdPref.updated_at === "string" &&
      createdPref.updated_at.endsWith("Z"),
  );
  TestValidator.equals(
    "preferences_json string matches",
    createdPref.preferences_json,
    preferenceBody.preferences_json,
  );

  // 4.1 Attempt creation with schema-violating preferences_json (empty string)
  await TestValidator.error("rejects empty preferences_json", async () => {
    await api.functional.healthcarePlatform.departmentHead.analyticsDashboards.preferences.create(
      connection,
      {
        dashboardId,
        body: {
          dashboard_id: dashboardId,
          user_id: loginResp.id,
          preferences_json: "",
        } satisfies IHealthcarePlatformDashboardPreference.ICreate,
      },
    );
  });

  // 4.2 Attempt creation by impersonating another user (mismatched user_id)
  await TestValidator.error(
    "cannot create preference using someone else's user_id",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.analyticsDashboards.preferences.create(
        connection,
        {
          dashboardId,
          body: {
            dashboard_id: dashboardId,
            user_id: typia.random<string & tags.Format<"uuid">>(),
            preferences_json: JSON.stringify({ theme: "light" }),
          } satisfies IHealthcarePlatformDashboardPreference.ICreate,
        },
      );
    },
  );

  // 4.3 Another department head tries to create preference for this dashboard
  const otherEmail: string = typia.random<string & tags.Format<"email">>();
  const otherPassword: string = RandomGenerator.alphaNumeric(10);
  const otherJoinReq = {
    email: otherEmail,
    full_name: RandomGenerator.name(),
    password: otherPassword,
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformDepartmentHead.IJoinRequest;
  const otherHead: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.join(connection, {
      body: otherJoinReq,
    });
  typia.assert(otherHead);
  const otherLoginReq = {
    email: otherEmail,
    password: otherPassword,
  } satisfies IHealthcarePlatformDepartmentHead.ILoginRequest;
  const otherLogin: IHealthcarePlatformDepartmentHead.IAuthorized =
    await api.functional.auth.departmentHead.login(connection, {
      body: otherLoginReq,
    });
  typia.assert(otherLogin);
  await TestValidator.error(
    "department head cannot create preference for dashboard out of scope",
    async () => {
      await api.functional.healthcarePlatform.departmentHead.analyticsDashboards.preferences.create(
        connection,
        {
          dashboardId,
          body: {
            dashboard_id: dashboardId,
            user_id: otherLogin.id,
            preferences_json: JSON.stringify({ theme: "dark" }),
          } satisfies IHealthcarePlatformDashboardPreference.ICreate,
        },
      );
    },
  );
}
