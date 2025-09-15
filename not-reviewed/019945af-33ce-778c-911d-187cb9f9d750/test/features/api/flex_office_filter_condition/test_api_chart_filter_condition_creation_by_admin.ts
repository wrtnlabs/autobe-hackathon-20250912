import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeChart";
import type { IFlexOfficeFilterCondition } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeFilterCondition";
import type { IFlexOfficeKpiWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeKpiWidget";

/**
 * Test the complete creation workflow of a filter condition associated with
 * a chart as an admin user.
 *
 * This test covers admin user setup, KPI widget creation, chart creation,
 * and filter condition creation attached to the chart. It validates proper
 * linkage between entities, correct API responses, and error handling for
 * invalid input and unauthorized access.
 *
 * It verifies the full end-to-end process ensuring admin role authorization
 * is enforced, input validation works, and created entities reflect proper
 * relationships and state.
 */
export async function test_api_chart_filter_condition_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register new admin user
  const adminCreateBody = {
    email: RandomGenerator.alphaNumeric(12) + "@admin.example.com",
    password: "AdminPass123!",
  } satisfies IFlexOfficeAdmin.ICreate;

  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // 2. Login admin user (to confirm login token functionality works separately)
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IFlexOfficeAdmin.ILogin;

  const adminLogin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLogin);

  // 3. Create KPI Widget
  const kpiWidgetCreateBody = {
    flex_office_widget_id: typia.random<string & tags.Format<"uuid">>(),
    config_json: JSON.stringify({ query: "SELECT COUNT(*) FROM users" }),
  } satisfies IFlexOfficeKpiWidget.ICreate;

  const kpiWidget: IFlexOfficeKpiWidget =
    await api.functional.flexOffice.admin.widgets.kpi.create(connection, {
      body: kpiWidgetCreateBody,
    });
  typia.assert(kpiWidget);

  // 4. Create Chart linked to KPI Widget
  const chartCreateBody = {
    flex_office_widget_id: kpiWidget.flex_office_widget_id,
    chart_type: "bar",
    title: "User Count Chart",
    description: "Counts number of users registered",
  } satisfies IFlexOfficeChart.ICreate;

  const chart: IFlexOfficeChart =
    await api.functional.flexOffice.admin.charts.create(connection, {
      body: chartCreateBody,
    });
  typia.assert(chart);
  TestValidator.equals(
    "chart's widget id matches KPI widget's widget id",
    chart.flex_office_widget_id,
    kpiWidget.flex_office_widget_id,
  );

  // 5. Create Filter Condition for the chart
  const filterConditionCreateBody = {
    flex_office_chart_id: chart.id,
    flex_office_widget_id: kpiWidget.flex_office_widget_id,
    filter_expression: "active = true",
    enabled: true,
  } satisfies IFlexOfficeFilterCondition.ICreate;

  const filterCondition: IFlexOfficeFilterCondition =
    await api.functional.flexOffice.admin.charts.filterConditions.create(
      connection,
      {
        chartId: chart.id,
        body: filterConditionCreateBody,
      },
    );
  typia.assert(filterCondition);
  TestValidator.equals(
    "filter condition references correct chart id",
    filterCondition.flex_office_chart_id,
    chart.id,
  );
  TestValidator.equals(
    "filter condition references correct widget id",
    filterCondition.flex_office_widget_id ?? null,
    kpiWidget.flex_office_widget_id,
  );
  TestValidator.equals(
    "filter condition expression matches",
    filterCondition.filter_expression,
    filterConditionCreateBody.filter_expression,
  );
  TestValidator.predicate(
    "filter condition is enabled",
    filterCondition.enabled === true,
  );

  // 6. Test creating filter condition with invalid data (empty filterExpression)
  await TestValidator.error(
    "filter condition creation fails with empty filterExpression",
    async () => {
      const invalidFilterConditionBody = {
        flex_office_chart_id: chart.id,
        flex_office_widget_id: kpiWidget.flex_office_widget_id,
        filter_expression: "",
        enabled: true,
      } satisfies IFlexOfficeFilterCondition.ICreate;

      await api.functional.flexOffice.admin.charts.filterConditions.create(
        connection,
        {
          chartId: chart.id,
          body: invalidFilterConditionBody,
        },
      );
    },
  );

  // 7. Test unauthorized access: simulate by creating a new connection without Authorization header
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized filter condition creation rejected",
    async () => {
      await api.functional.flexOffice.admin.charts.filterConditions.create(
        unauthConnection,
        {
          chartId: chart.id,
          body: filterConditionCreateBody,
        },
      );
    },
  );
}
