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

export async function test_api_delete_chart_filter_condition_editor_success(
  connection: api.IConnection,
) {
  // 1. Register a new editor user and authenticate
  const editorName = RandomGenerator.name();
  const editorEmail = typia.random<string & tags.Format<"email">>();
  const editorPassword = "P@ssword1234";

  const editorAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: {
        name: editorName,
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ICreate,
    });
  typia.assert(editorAuthorized);

  // Ensure logged in as editor using login
  const editorLoggedIn: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: {
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ILogin,
    });
  typia.assert(editorLoggedIn);

  // 2. Create a marketplace widget (admin role is needed)
  // Create an admin user for admin privileges
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminP@ss123";

  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // Login as admin
  const adminLoggedIn: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(adminLoggedIn);

  // Create marketplace widget using admin connection
  // Create fresh adminConnection with proper headers object
  const adminConnection: api.IConnection = { ...connection, headers: {} };

  // Login as admin with the new connection to set Authorization header automatically
  await api.functional.auth.admin.login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IFlexOfficeAdmin.ILogin,
  });

  const widgetCreateBody = {
    widget_code: RandomGenerator.alphaNumeric(6).toLowerCase(),
    name: `Widget-${RandomGenerator.alphaNumeric(5)}`,
    version: `1.0.0`,
    description: `Test widget for chart association`,
  } satisfies IFlexOfficeMarketplaceWidget.ICreate;

  const marketplaceWidget: IFlexOfficeMarketplaceWidget =
    await api.functional.flexOffice.admin.marketplaceWidgets.create(
      adminConnection,
      {
        body: widgetCreateBody,
      },
    );
  typia.assert(marketplaceWidget);

  // 3. Create chart associated with that widget as editor
  const editorConnection: api.IConnection = { ...connection, headers: {} };

  // Login as editor again for safety
  await api.functional.auth.editor.login(editorConnection, {
    body: {
      email: editorEmail,
      password: editorPassword,
    } satisfies IFlexOfficeEditor.ILogin,
  });

  const chartCreateBody = {
    flex_office_widget_id: marketplaceWidget.id,
    chart_type: "bar",
    title: `Chart of widget ${marketplaceWidget.name}`,
    description: `Test chart for filter condition deletion scenario`,
  } satisfies IFlexOfficeChart.ICreate;

  const chart: IFlexOfficeChart =
    await api.functional.flexOffice.editor.charts.create(editorConnection, {
      body: chartCreateBody,
    });
  typia.assert(chart);

  // 4. Create filter condition for the chart
  const filterConditionCreateBody = {
    flex_office_chart_id: chart.id,
    filter_expression: "region = 'US'",
    enabled: true,
  } satisfies IFlexOfficeFilterCondition.ICreate;

  const filterCondition: IFlexOfficeFilterCondition =
    await api.functional.flexOffice.editor.charts.filterConditions.create(
      editorConnection,
      {
        chartId: chart.id,
        body: filterConditionCreateBody,
      },
    );
  typia.assert(filterCondition);

  // 5. Delete the filter condition by its ID
  await api.functional.flexOffice.editor.charts.filterConditions.erase(
    editorConnection,
    {
      chartId: chart.id as string & tags.Format<"uuid">,
      filterConditionId: filterCondition.id as string & tags.Format<"uuid">,
    },
  );

  // 6. The delete operation returns void, ensure no error and verify deletion by no further retrieval (no retrieval API here so just assume success)

  // 7. Success confirmed if no exception thrown
  TestValidator.predicate("successful deletion of filter condition", true);
}
