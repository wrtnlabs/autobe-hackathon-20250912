import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeChart";
import type { IFlexOfficeFilterCondition } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeFilterCondition";

/**
 * Test retrieval of a specific filter condition linked to a chart by an
 * admin user.
 *
 * This test validates that an admin user can successfully:
 *
 * - Register and authenticate an admin account.
 * - Create a chart linked to a simulated KPI widget.
 * - Create a filter condition associated with the chart and widget.
 * - Retrieve the filter condition and confirm the accuracy of its details.
 *
 * The test also covers:
 *
 * - Enforcement of authorization by verifying access denial for
 *   unauthenticated users.
 * - Proper error handling when attempting to retrieve non-existent charts or
 *   filter conditions.
 *
 * This comprehensive scenario ensures the integrity, security, and correct
 * functionality of the filter condition retrieval endpoint for admin
 * users.
 */
export async function test_api_chart_filter_condition_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(10);

  const adminJoin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(adminJoin);

  // 2. Admin logs in
  const adminLogin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 3. Simulate KPI widget creation by generating a widgetId
  // Widget creation API is unavailable, so we simulate with a random UUID
  const widgetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Create a chart linked to the widget
  const chartCreateBody = {
    flex_office_widget_id: widgetId,
    chart_type: "bar",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IFlexOfficeChart.ICreate;

  const chart: IFlexOfficeChart =
    await api.functional.flexOffice.admin.charts.create(connection, {
      body: chartCreateBody,
    });
  typia.assert(chart);

  // 5. Create a filter condition linked to the chart and widget
  const filterExpression = `field_${RandomGenerator.alphaNumeric(5)} > 100`;
  const filterConditionCreateBody = {
    flex_office_chart_id: chart.id,
    flex_office_widget_id: widgetId,
    filter_expression: filterExpression,
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

  // 6. Retrieve the filter condition with correct admin authentication
  const retrievedCondition: IFlexOfficeFilterCondition =
    await api.functional.flexOffice.admin.charts.filterConditions.at(
      connection,
      {
        chartId: chart.id,
        filterConditionId: filterCondition.id,
      },
    );
  typia.assert(retrievedCondition);

  TestValidator.equals(
    "retrieved filter condition ID matches created ID",
    retrievedCondition.id,
    filterCondition.id,
  );

  TestValidator.equals(
    "retrieved filter condition chart ID matches created chart ID",
    retrievedCondition.flex_office_chart_id,
    chart.id,
  );

  TestValidator.equals(
    "retrieved filter condition widget ID matches created widget ID",
    retrievedCondition.flex_office_widget_id,
    widgetId,
  );

  TestValidator.equals(
    "retrieved filter condition expression matches created expression",
    retrievedCondition.filter_expression,
    filterExpression,
  );

  TestValidator.predicate(
    "retrieved filter condition enabled flag is true",
    retrievedCondition.enabled === true,
  );

  // 7. Attempt retrieval without authentication (unauthenticated)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated retrieval should fail",
    async () => {
      await api.functional.flexOffice.admin.charts.filterConditions.at(
        unauthenticatedConnection,
        {
          chartId: chart.id,
          filterConditionId: filterCondition.id,
        },
      );
    },
  );

  // 8. Attempt retrieval with non-existing chart ID
  await TestValidator.error(
    "retrieval with non-existent chart ID fails",
    async () => {
      await api.functional.flexOffice.admin.charts.filterConditions.at(
        connection,
        {
          chartId: typia.random<string & tags.Format<"uuid">>(),
          filterConditionId: filterCondition.id,
        },
      );
    },
  );

  // 9. Attempt retrieval with non-existing filter condition ID
  await TestValidator.error(
    "retrieval with non-existent filter condition ID fails",
    async () => {
      await api.functional.flexOffice.admin.charts.filterConditions.at(
        connection,
        {
          chartId: chart.id,
          filterConditionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
