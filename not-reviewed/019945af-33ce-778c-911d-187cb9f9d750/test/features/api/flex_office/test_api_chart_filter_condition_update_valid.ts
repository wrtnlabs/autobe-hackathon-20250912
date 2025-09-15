import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeChart";
import type { IFlexOfficeFilterCondition } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeFilterCondition";
import type { IFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeMarketplaceWidget";

export async function test_api_chart_filter_condition_update_valid(
  connection: api.IConnection,
) {
  // 1. Admin join to create an authorized admin account
  const adminJoinBody = {
    email: `${RandomGenerator.name(1)}${RandomGenerator.alphaNumeric(4)}@example.com`,
    password: "adminpass123",
  } satisfies IFlexOfficeAdmin.ICreate;
  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin login
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
  } satisfies IFlexOfficeAdmin.ILogin;
  const adminLoginAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 3. Create a marketplace widget
  const marketplaceWidgetBody = {
    widget_code: `wid_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(2),
    version: "1.0.0",
    description: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IFlexOfficeMarketplaceWidget.ICreate;
  const marketplaceWidget: IFlexOfficeMarketplaceWidget =
    await api.functional.flexOffice.admin.marketplaceWidgets.create(
      connection,
      {
        body: marketplaceWidgetBody,
      },
    );
  typia.assert(marketplaceWidget);

  // 4. Create a chart linked to the marketplace widget's ID
  const chartCreateBody = {
    flex_office_widget_id: marketplaceWidget.id,
    chart_type: RandomGenerator.pick(["bar", "line", "pie"] as const),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IFlexOfficeChart.ICreate;
  const chart: IFlexOfficeChart =
    await api.functional.flexOffice.admin.charts.create(connection, {
      body: chartCreateBody,
    });
  typia.assert(chart);

  // 5. Create a filter condition for the chart
  const filterConditionCreateBody = {
    flex_office_chart_id: chart.id,
    filter_expression: "status = 'active'",
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

  // 6. Update the filter condition: change filter_expression and toggle enabled flag
  const updatedFilterExpression = `status = 'inactive' AND priority > 3`;
  const updatedEnabledStatus = !filterCondition.enabled;
  const filterConditionUpdateBody = {
    filter_expression: updatedFilterExpression,
    enabled: updatedEnabledStatus,
  } satisfies IFlexOfficeFilterCondition.IUpdate;
  const updatedFilterCondition: IFlexOfficeFilterCondition =
    await api.functional.flexOffice.admin.charts.filterConditions.update(
      connection,
      {
        chartId: chart.id,
        filterConditionId: filterCondition.id,
        body: filterConditionUpdateBody,
      },
    );
  typia.assert(updatedFilterCondition);

  // 7. Retrieve the updated filter condition details
  const retrievedFilterCondition: IFlexOfficeFilterCondition =
    await api.functional.flexOffice.admin.charts.filterConditions.at(
      connection,
      {
        chartId: chart.id,
        filterConditionId: filterCondition.id,
      },
    );
  typia.assert(retrievedFilterCondition);

  // 8. Confirm that the retrieved data matches the updated values
  TestValidator.equals(
    "filter expression updated",
    retrievedFilterCondition.filter_expression,
    updatedFilterExpression,
  );
  TestValidator.equals(
    "enabled flag updated",
    retrievedFilterCondition.enabled,
    updatedEnabledStatus,
  );
  TestValidator.equals(
    "filter condition id unchanged",
    retrievedFilterCondition.id,
    filterCondition.id,
  );
  TestValidator.equals(
    "chart id unchanged",
    retrievedFilterCondition.flex_office_chart_id,
    chart.id,
  );
}
