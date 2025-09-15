import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeChart";
import type { IFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeViewer";

/**
 * This E2E test validates the full viewer user flow for registration, login,
 * chart creation, and update operations within the FlexOffice system. It
 * ensures authentication is correctly handled, that only charts linked to the
 * user's widget can be updated, and that update results reflect expected data
 * changes.
 *
 * The test also performs failure scenarios including unauthorized access and
 * invalid chart IDs, confirming proper error barriers.
 *
 * Validation uses typia.assert to confirm API responses comply with DTOs, and
 * TestValidator assertions check business logic.
 *
 * All API calls and awaited error validations adhere strictly to schema
 * definitions and formatting constraints.
 */
export async function test_api_chart_update_by_viewer_user(
  connection: api.IConnection,
) {
  // 1. Perform viewer user registration
  const viewerCreateBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IFlexOfficeViewer.ICreate;
  const viewer: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.join(connection, {
      body: viewerCreateBody,
    });
  typia.assert(viewer);

  // 2. Perform login with viewer credentials
  const viewerLoginBody = {
    email: viewerCreateBody.email,
    password: viewerCreateBody.password,
  } satisfies IFlexOfficeViewer.ILogin;
  const viewerLoggedIn: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.login(connection, {
      body: viewerLoginBody,
    });
  typia.assert(viewerLoggedIn);

  // 3. Create a chart linked to a widget
  const chartCreateBody = {
    flex_office_widget_id: typia.random<string & tags.Format<"uuid">>(),
    chart_type: RandomGenerator.pick(["bar", "line", "pie"] as const),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 5,
      wordMax: 8,
    }),
  } satisfies IFlexOfficeChart.ICreate;
  const createdChart: IFlexOfficeChart =
    await api.functional.flexOffice.viewer.charts.create(connection, {
      body: chartCreateBody,
    });
  typia.assert(createdChart);

  // 4. Update the chart with valid modifications
  const chartUpdateBody = {
    chart_type: RandomGenerator.pick(["bar", "line", "pie"] as const),
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 5, wordMax: 12 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 7,
      sentenceMax: 15,
      wordMin: 6,
      wordMax: 12,
    }),
  } satisfies IFlexOfficeChart.IUpdate;
  const updatedChart: IFlexOfficeChart =
    await api.functional.flexOffice.viewer.charts.update(connection, {
      chartId: createdChart.id,
      body: chartUpdateBody,
    });
  typia.assert(updatedChart);

  // Assertions verifying updated properties
  TestValidator.equals(
    "chart ID matches after update",
    updatedChart.id,
    createdChart.id,
  );
  TestValidator.equals(
    "widget ID remains unchanged",
    updatedChart.flex_office_widget_id,
    createdChart.flex_office_widget_id,
  );
  TestValidator.equals(
    "chart type updated correctly",
    updatedChart.chart_type,
    chartUpdateBody.chart_type ?? createdChart.chart_type,
  );
  TestValidator.equals(
    "title updated correctly",
    updatedChart.title,
    chartUpdateBody.title ?? createdChart.title,
  );
  TestValidator.equals(
    "description updated correctly",
    updatedChart.description ?? null,
    chartUpdateBody.description ?? null,
  );

  // 5. Failure tests
  // 5a. Unauthorized update attempt
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized update attempt should fail",
    async () => {
      await api.functional.flexOffice.viewer.charts.update(
        unauthenticatedConnection,
        {
          chartId: createdChart.id,
          body: chartUpdateBody,
        },
      );
    },
  );

  // 5b. Update with invalid chart ID
  await TestValidator.error(
    "update with invalid chartId should fail",
    async () => {
      await api.functional.flexOffice.viewer.charts.update(connection, {
        chartId: typia.random<string & tags.Format<"uuid">>(),
        body: chartUpdateBody,
      });
    },
  );
}
