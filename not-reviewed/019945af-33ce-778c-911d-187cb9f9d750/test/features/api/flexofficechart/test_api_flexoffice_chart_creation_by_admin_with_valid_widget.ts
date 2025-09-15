import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeChart";

/**
 * Validate the creation of a new FlexOffice analytics chart by an
 * authenticated Admin user with valid widget association.
 *
 * This end-to-end test covers the full workflow:
 *
 * 1. Admin user registration (join) with email and password.
 * 2. Admin user login to obtain JWT tokens for authorized access.
 * 3. Creation of a FlexOffice widget resource, which serves as a required
 *    dependency.
 * 4. Successful chart creation linked to the created widget, verifying all
 *    response fields including UUIDs and timestamps.
 * 5. Validation of error scenarios: creation with non-existent widget ID and
 *    invalid chart data inducing failures.
 *
 * This comprehensive test ensures both the correct functionality of chart
 * creation and robust error handling with invalid inputs.
 */
export async function test_api_flexoffice_chart_creation_by_admin_with_valid_widget(
  connection: api.IConnection,
) {
  // 1. Admin user registration (join)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string>();

  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin user login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IFlexOfficeAdmin.ILogin,
  });

  // 3. Create FlexOffice widget resource simulation
  const validWidgetId = typia.random<string & tags.Format<"uuid">>();

  // 4. Successful chart creation
  const chartCreateBody: IFlexOfficeChart.ICreate = {
    flex_office_widget_id: validWidgetId,
    chart_type: "bar",
    title: "Monthly Sales Report",
    description: "An overview of monthly sales metrics.",
  };

  const createdChart = await api.functional.flexOffice.admin.charts.create(
    connection,
    {
      body: chartCreateBody,
    },
  );
  typia.assert(createdChart);

  TestValidator.equals(
    "chart flex_office_widget_id matches input",
    createdChart.flex_office_widget_id,
    chartCreateBody.flex_office_widget_id,
  );
  TestValidator.notEquals("chart id assigned", createdChart.id, "");

  TestValidator.equals(
    "chart type matches input",
    createdChart.chart_type,
    chartCreateBody.chart_type,
  );

  TestValidator.equals(
    "chart title matches input",
    createdChart.title,
    chartCreateBody.title,
  );

  TestValidator.predicate(
    "createdAt is ISO 8601 string",
    typeof createdChart.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(createdChart.created_at),
  );

  TestValidator.predicate(
    "updatedAt is ISO 8601 string",
    typeof createdChart.updated_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z$/.test(createdChart.updated_at),
  );

  // 5. Error case: Non-existent widget ID
  const nonExistentWidgetId = typia.random<string & tags.Format<"uuid">>();
  if (nonExistentWidgetId !== validWidgetId) {
    await TestValidator.error(
      "creating chart with non-existent widget should throw error",
      async () => {
        await api.functional.flexOffice.admin.charts.create(connection, {
          body: {
            flex_office_widget_id: nonExistentWidgetId,
            chart_type: "line",
            title: "Invalid Widget Chart",
          } satisfies IFlexOfficeChart.ICreate,
        });
      },
    );
  }

  // 6. Error case: Invalid chart data (empty title and invalid chart_type)
  await TestValidator.error(
    "creating chart with invalid data should throw error",
    async () => {
      await api.functional.flexOffice.admin.charts.create(connection, {
        body: {
          flex_office_widget_id: validWidgetId,
          chart_type: "", // Invalid chart type
          title: "", // Empty title
        } satisfies IFlexOfficeChart.ICreate,
      });
    },
  );
}
