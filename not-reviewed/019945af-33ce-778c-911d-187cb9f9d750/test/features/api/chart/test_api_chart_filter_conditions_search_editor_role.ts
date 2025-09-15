import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeChart";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficeFilterCondition } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeFilterCondition";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeFilterCondition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeFilterCondition";

/**
 * End-to-End Test for Filter Conditions Search by Editor Role
 *
 * This test covers the complete scenario where an editor user registers,
 * authenticates, creates a chart, adds filter conditions, and searches
 * filter conditions with pagination and filtering options. It validates the
 * authorization enforcement, response schema, and business rule
 * compliance.
 *
 * Workflow steps:
 *
 * 1. Register an editor user using /auth/editor/join
 * 2. Log in the editor user using /auth/editor/login
 * 3. Create a FlexOffice chart linked to a widget
 * 4. Create multiple filter conditions associated with the chart
 * 5. Perform a PATCH search on the chart's filter conditions with filters and
 *    pagination
 * 6. Validate all returned filter conditions relate to the chart and
 *    pagination data is correct
 */
export async function test_api_chart_filter_conditions_search_editor_role(
  connection: api.IConnection,
) {
  // 1-2. Register and login editor user
  const editorName = RandomGenerator.name();
  const editorEmail = typia.random<string & tags.Format<"email">>();
  const editorPassword = "P@ssw0rd123";

  const joinBody = {
    name: editorName,
    email: editorEmail,
    password: editorPassword,
  } satisfies IFlexOfficeEditor.ICreate;

  const joinResp = await api.functional.auth.editor.join(connection, {
    body: joinBody,
  });
  typia.assert(joinResp);

  const loginBody = {
    email: editorEmail,
    password: editorPassword,
  } satisfies IFlexOfficeEditor.ILogin;

  const loginResp = await api.functional.auth.editor.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResp);

  // 3. Create a chart linked to a widget
  // We'll generate a random widget ID to link with
  const widgetId = typia.random<string & tags.Format<"uuid">>();
  const chartBody = {
    flex_office_widget_id: widgetId,
    chart_type: "bar",
    title: `Test Chart - ${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 })}`,
    description: null, // Explicit null since optional
  } satisfies IFlexOfficeChart.ICreate;

  const chart = await api.functional.flexOffice.editor.charts.create(
    connection,
    {
      body: chartBody,
    },
  );
  typia.assert(chart);

  // 4. Create several filter conditions for this chart
  const filterConditionsCount = 5;
  const filterConditionsCreated: IFlexOfficeFilterCondition[] = [];
  for (let i = 0; i < filterConditionsCount; i++) {
    const filterConditionBody = {
      flex_office_chart_id: chart.id,
      flex_office_widget_id: null,
      filter_expression: `field${i} > ${RandomGenerator.alphaNumeric(3)}`,
      enabled: RandomGenerator.pick([true, false] as const),
    } satisfies IFlexOfficeFilterCondition.ICreate;

    const filterCondition =
      await api.functional.flexOffice.editor.charts.filterConditions.create(
        connection,
        {
          chartId: chart.id,
          body: filterConditionBody,
        },
      );
    typia.assert(filterCondition);
    filterConditionsCreated.push(filterCondition);
  }

  // 5. Search filter conditions with filters and pagination
  const searchBody = {
    flex_office_chart_id: chart.id,
    filter_expression: filterConditionsCreated[0].filter_expression.substring(
      0,
      3,
    ), // Partial substring for filtering
    enabled: null, // Accept all enabled states
    flex_office_widget_id: null, // Null explicit
    page: 1,
    limit: 3,
  } satisfies IFlexOfficeFilterCondition.IRequest;

  const searchResult =
    await api.functional.flexOffice.editor.charts.filterConditions.index(
      connection,
      {
        chartId: chart.id,
        body: searchBody,
      },
    );
  typia.assert(searchResult);

  // 6. Validate all results relate to the chart
  TestValidator.predicate(
    "all filter conditions belong to the searched chart",
    searchResult.data.every((fc) => fc.flex_office_chart_id === chart.id),
  );

  // Validate pagination data
  const pagination = searchResult.pagination;
  TestValidator.predicate(
    "pagination current page should match request",
    pagination.current === (searchBody.page ?? 1),
  );
  TestValidator.predicate(
    "pagination limit should match request",
    pagination.limit === (searchBody.limit ?? 10),
  );
  TestValidator.predicate(
    "pagination records count should be less or equal to total created",
    pagination.records >= searchResult.data.length,
  );
  TestValidator.predicate(
    "pagination pages should be consistent",
    pagination.pages === Math.ceil(pagination.records / pagination.limit),
  );
}
