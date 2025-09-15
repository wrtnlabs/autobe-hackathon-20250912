import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeChart";

/**
 * This E2E test verifies the admin user's ability to update an existing
 * analytics chart. The test covers the full workflow from creating and
 * authenticating an admin user, creating an initial chart linked to a valid
 * UI widget ID, to updating the chart with modified data.
 *
 * The test validates that updates are correctly persisted and returned by
 * the system, enforcing strict admin authorization and error handling.
 *
 * Error cases are included for unauthorized update attempts and invalid
 * chart ID usage, ensuring robust security and validation compliance.
 *
 * Steps:
 *
 * 1. Register a new admin user with unique and valid email and password.
 * 2. Log in as the admin user to get authorization tokens automatically
 *    managed by the SDK.
 * 3. Create a new chart linked to a valid widget represented by a generated
 *    UUID.
 * 4. Update the chart with changed properties including widget ID, type,
 *    title, and description (explicit null allowed).
 * 5. Assert the updated chart response matches the update payload accurately.
 * 6. Attempt an unauthorized update with cleared headers and expect failure.
 * 7. Attempt updating with an invalid random chart ID and expect failure.
 */
export async function test_api_chart_update_by_admin_user(
  connection: api.IConnection,
) {
  // 1. Admin user registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    password: "Test@1234",
  } satisfies IFlexOfficeAdmin.ICreate;

  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(adminAuthorized);

  // 2. Admin user login
  const adminLoginBody = {
    email: adminEmail,
    password: "Test@1234",
  } satisfies IFlexOfficeAdmin.ILogin;

  const adminLoginAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoginAuthorized);

  // Generate a single valid widget UUID to link chart
  const widgetId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create a new chart linked to the widget
  const createChartBody = {
    flex_office_widget_id: widgetId,
    chart_type: RandomGenerator.pick(["bar", "line", "pie"] as const),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 6,
    }),
  } satisfies IFlexOfficeChart.ICreate;

  const createdChart: IFlexOfficeChart =
    await api.functional.flexOffice.admin.charts.create(connection, {
      body: createChartBody,
    });
  typia.assert(createdChart);

  // 4. Update the chart with new values, using consistent widgetId
  const updateChartBody = {
    flex_office_widget_id: widgetId,
    chart_type: RandomGenerator.pick(["bar", "line", "pie"] as const),
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 5, wordMax: 10 }),
    description: null, // explicit null allowed
  } satisfies IFlexOfficeChart.IUpdate;

  const updatedChart: IFlexOfficeChart =
    await api.functional.flexOffice.admin.charts.update(connection, {
      chartId: createdChart.id,
      body: updateChartBody,
    });
  typia.assert(updatedChart);

  // 5. Assert updated response accurately reflects request
  TestValidator.equals(
    "updated chart flex_office_widget_id matches request",
    updatedChart.flex_office_widget_id,
    updateChartBody.flex_office_widget_id!,
  );

  TestValidator.equals(
    "updated chart type matches request",
    updatedChart.chart_type,
    updateChartBody.chart_type!,
  );

  TestValidator.equals(
    "updated chart title matches request",
    updatedChart.title,
    updateChartBody.title!,
  );

  TestValidator.equals(
    "updated chart description matches request",
    updatedChart.description,
    updateChartBody.description,
  );

  // 6-1. Error test: unauthorized update attempt
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized update should fail", async () => {
    await api.functional.flexOffice.admin.charts.update(
      unauthorizedConnection,
      {
        chartId: createdChart.id,
        body: updateChartBody,
      },
    );
  });

  // 6-2. Error test: update with invalid chartId
  await TestValidator.error(
    "update with invalid chart id should fail",
    async () => {
      await api.functional.flexOffice.admin.charts.update(connection, {
        chartId: typia.random<string & tags.Format<"uuid">>(),
        body: updateChartBody,
      });
    },
  );
}
