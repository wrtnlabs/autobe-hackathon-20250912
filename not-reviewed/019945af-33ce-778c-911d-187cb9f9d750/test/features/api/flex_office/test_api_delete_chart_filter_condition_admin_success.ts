import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeChart";
import type { IFlexOfficeFilterCondition } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeFilterCondition";
import type { IFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeMarketplaceWidget";

export async function test_api_delete_chart_filter_condition_admin_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin user via /auth/admin/join
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminPassword = `${RandomGenerator.alphaNumeric(12)}`;
  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // 2. Login as the admin user via /auth/admin/login
  const adminLogin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 3. Create marketplace widget
  const marketplaceWidget: IFlexOfficeMarketplaceWidget =
    await api.functional.flexOffice.admin.marketplaceWidgets.create(
      connection,
      {
        body: {
          widget_code: `widget_${RandomGenerator.alphaNumeric(6)}`,
          name: RandomGenerator.name(),
          version: "1.0.0",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IFlexOfficeMarketplaceWidget.ICreate,
      },
    );
  typia.assert(marketplaceWidget);

  // 4. Create chart associated with marketplace widget
  const chart: IFlexOfficeChart =
    await api.functional.flexOffice.admin.charts.create(connection, {
      body: {
        flex_office_widget_id: marketplaceWidget.id,
        chart_type: "bar",
        title: `Chart ${RandomGenerator.alphaNumeric(5)}`,
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IFlexOfficeChart.ICreate,
    });
  typia.assert(chart);

  // 5. Create filter condition for the chart
  const filterCondition: IFlexOfficeFilterCondition =
    await api.functional.flexOffice.admin.charts.filterConditions.create(
      connection,
      {
        chartId: chart.id,
        body: {
          flex_office_chart_id: chart.id,
          flex_office_widget_id: marketplaceWidget.id,
          filter_expression: "status = 'active'",
          enabled: true,
        } satisfies IFlexOfficeFilterCondition.ICreate,
      },
    );
  typia.assert(filterCondition);

  // 6. Delete the created filter condition
  await api.functional.flexOffice.admin.charts.filterConditions.erase(
    connection,
    {
      chartId: chart.id,
      filterConditionId: filterCondition.id,
    },
  );

  // 7. Since erase returns void, just check no exceptions thrown
  // No need for explicit retrieval attempt as delete succeeded if no error
}
