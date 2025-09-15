import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeChart";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficeFilterCondition } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeFilterCondition";
import type { IFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeMarketplaceWidget";

/**
 * This end-to-end test verifies the entire workflow of updating a chart filter
 * condition as an editor user.
 *
 * Steps included:
 *
 * 1. Register an editor user and authenticate.
 * 2. Create a marketplace widget.
 * 3. Create a chart tied to the marketplace widget.
 * 4. Create a filter condition for the chart.
 * 5. Update the filter condition.
 * 6. Retrieve and verify the updated filter condition.
 */
export async function test_api_chart_filter_condition_update_editor_valid(
  connection: api.IConnection,
) {
  // 1. Register an editor user
  const editorEmail = typia.random<string & tags.Format<"email">>();
  const editorName = RandomGenerator.name();
  const editorPassword = "StrongP@ssw0rd!";

  const editor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: {
        name: editorName,
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ICreate,
    });
  typia.assert(editor);

  // 2. Login as the editor user
  const login: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: {
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ILogin,
    });
  typia.assert(login);

  // 3. Create a marketplace widget
  const mpWidgetBody = {
    widget_code: `widget_${RandomGenerator.alphaNumeric(8)}`,
    name: `Marketplace Widget ${RandomGenerator.name()}`,
    version: "1.0.0",
    description: null,
  } satisfies IFlexOfficeMarketplaceWidget.ICreate;

  const marketplaceWidget: IFlexOfficeMarketplaceWidget =
    await api.functional.flexOffice.admin.marketplaceWidgets.create(
      connection,
      {
        body: mpWidgetBody,
      },
    );
  typia.assert(marketplaceWidget);

  // 4. Create a chart associated with the marketplace widget
  const chartCreateBody = {
    flex_office_widget_id: marketplaceWidget.id,
    chart_type: "bar",
    title: `Chart for ${marketplaceWidget.name}`,
    description: null,
  } satisfies IFlexOfficeChart.ICreate;

  const chart: IFlexOfficeChart =
    await api.functional.flexOffice.editor.charts.create(connection, {
      body: chartCreateBody,
    });
  typia.assert(chart);

  // 5. Create initial filter condition for the chart
  const filterConditionCreateBody = {
    flex_office_chart_id: chart.id,
    flex_office_widget_id: null,
    filter_expression: "fieldA > 100",
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

  // 6. Update the filter condition with new filter details
  const filterConditionUpdateBody = {
    filter_expression: "fieldA > 200",
    enabled: false,
  } satisfies IFlexOfficeFilterCondition.IUpdate;

  const updatedFilterCondition: IFlexOfficeFilterCondition =
    await api.functional.flexOffice.editor.charts.filterConditions.update(
      connection,
      {
        chartId: chart.id,
        filterConditionId: filterCondition.id,
        body: filterConditionUpdateBody,
      },
    );
  typia.assert(updatedFilterCondition);

  TestValidator.equals(
    "Updated filter condition ID should match original",
    updatedFilterCondition.id,
    filterCondition.id,
  );
  TestValidator.equals(
    "Updated filter expression should be new value",
    updatedFilterCondition.filter_expression,
    filterConditionUpdateBody.filter_expression!,
  );
  TestValidator.equals(
    "Updated enabled flag should be new value",
    updatedFilterCondition.enabled,
    filterConditionUpdateBody.enabled!,
  );

  // 7. Retrieve updated filter condition and verify
  const retrievedFilterCondition: IFlexOfficeFilterCondition =
    await api.functional.flexOffice.editor.charts.filterConditions.at(
      connection,
      {
        chartId: chart.id,
        filterConditionId: filterCondition.id,
      },
    );
  typia.assert(retrievedFilterCondition);

  TestValidator.equals(
    "Retrieved filter condition matches updated",
    retrievedFilterCondition,
    updatedFilterCondition,
  );
}
