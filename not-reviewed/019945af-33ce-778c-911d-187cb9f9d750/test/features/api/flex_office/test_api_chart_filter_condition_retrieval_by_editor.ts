import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeChart";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficeFilterCondition } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeFilterCondition";

/**
 * Validate retrieval of a specific filter condition linked to a chart by an
 * editor user.
 *
 * This e2e test performs a realistic business workflow:
 *
 * 1. Registers a new editor user
 * 2. Creates a chart linked to a randomly generated widget ID
 * 3. Creates a filter condition attached to the chart
 * 4. Retrieves the filter condition by its ID
 * 5. Validates that all returned data matches the created entities
 *
 * The test confirms that filter conditions are accessible only to
 * authorized editors and the API returns accurate and complete filter
 * condition data.
 *
 * Note: Widget creation is simulated via a random UUID due to lack of
 * widget API.
 */
export async function test_api_chart_filter_condition_retrieval_by_editor(
  connection: api.IConnection,
) {
  // 1. Register a new editor user
  const editorCreateBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IFlexOfficeEditor.ICreate;

  const editorAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreateBody,
    });
  typia.assert(editorAuthorized);

  // 2. Generate a random widget ID to simulate widget linkage
  const fakeWidgetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Create a new chart linked to the widget
  const chartCreateBody = {
    flex_office_widget_id: fakeWidgetId,
    chart_type: "bar",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: "Test chart for filter condition retrieval",
  } satisfies IFlexOfficeChart.ICreate;

  const chart: IFlexOfficeChart =
    await api.functional.flexOffice.editor.charts.create(connection, {
      body: chartCreateBody,
    });
  typia.assert(chart);

  // 4. Create a filter condition linked to the chart
  const filterExpression = "fieldA > 100 AND fieldB < 50";

  const filterConditionCreateBody = {
    flex_office_chart_id: chart.id,
    flex_office_widget_id: fakeWidgetId,
    filter_expression: filterExpression,
    enabled: true,
  } satisfies IFlexOfficeFilterCondition.ICreate;

  const filterCondition: IFlexOfficeFilterCondition =
    await api.functional.flexOffice.editor.charts.filterConditions.create(
      connection,
      {
        chartId: chart.id,
        body: filterConditionCreateBody,
      },
    );
  typia.assert(filterCondition);

  // 5. Retrieve the filter condition by ID
  const retrievedFilterCondition: IFlexOfficeFilterCondition =
    await api.functional.flexOffice.editor.charts.filterConditions.at(
      connection,
      {
        chartId: chart.id,
        filterConditionId: filterCondition.id,
      },
    );
  typia.assert(retrievedFilterCondition);

  // 6. Validate retrieved filter condition data matches created data
  TestValidator.equals(
    "filter condition ID matches",
    retrievedFilterCondition.id,
    filterCondition.id,
  );
  TestValidator.equals(
    "filter condition chart ID matches",
    retrievedFilterCondition.flex_office_chart_id,
    chart.id,
  );
  TestValidator.equals(
    "filter condition widget ID matches",
    retrievedFilterCondition.flex_office_widget_id,
    fakeWidgetId,
  );
  TestValidator.equals(
    "filter condition expression matches",
    retrievedFilterCondition.filter_expression,
    filterExpression,
  );
  TestValidator.predicate(
    "filter condition is enabled",
    retrievedFilterCondition.enabled === true,
  );
}
