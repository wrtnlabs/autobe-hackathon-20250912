import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeChart";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";

/**
 * Scenario Overview: This scenario tests that an editor user can
 * successfully update an existing analytics chart. It verifies that
 * appropriate authorization is enforced and that the update operation
 * correctly modifies chart attributes.
 *
 * Step-by-Step Workflow:
 *
 * 1. Register a new editor user via POST /auth/editor/join and authenticate
 *    using POST /auth/editor/login.
 * 2. Create a UI widget linked to the editor. (Widget creation is simulated by
 *    generating a random UUID since no widget API is provided.)
 * 3. Create a new chart linked to that widget via POST
 *    /flexOffice/editor/charts.
 * 4. Update the chart using PUT /flexOffice/editor/charts/{chartId} with new
 *    values.
 * 5. Validate the response shows updated values.
 * 6. Attempt updates with invalid chartId and verify error handling.
 *
 * Validation Points:
 *
 * - Authentication tokens obtained are valid and used in subsequent requests.
 * - Chart update data respects schema constraints and authorization role.
 * - Responses accurately reflect updated chart details.
 *
 * Business Logic:
 *
 * - Editor role can modify charts linked to their widgets.
 * - Updates require authentication.
 *
 * Success Criteria:
 *
 * - Correct HTTP statuses for success and error cases.
 * - Data integrity maintained in updates.
 *
 * Error Handling:
 *
 * - Unauthorized access returns 401 or 403.
 * - Not found resources return 404.
 */
export async function test_api_chart_update_by_editor_user(
  connection: api.IConnection,
) {
  // 1. Register a new editor user
  const editorName = RandomGenerator.name();
  const editorEmail = typia.random<string & tags.Format<"email">>();
  const editorPassword = "strongpassword123";
  const editor = await api.functional.auth.editor.join(connection, {
    body: {
      name: editorName,
      email: editorEmail,
      password: editorPassword,
    } satisfies IFlexOfficeEditor.ICreate,
  });
  typia.assert(editor);

  // 2. Authenticate the editor user
  const auth = await api.functional.auth.editor.login(connection, {
    body: {
      email: editorEmail,
      password: editorPassword,
    } satisfies IFlexOfficeEditor.ILogin,
  });
  typia.assert(auth);

  // 3. Create a new chart linked to a widget
  const widgetId = typia.random<string & tags.Format<"uuid">>();
  const chartCreateBody = {
    flex_office_widget_id: widgetId,
    chart_type: "bar",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IFlexOfficeChart.ICreate;

  const chart = await api.functional.flexOffice.editor.charts.create(
    connection,
    {
      body: chartCreateBody,
    },
  );
  typia.assert(chart);
  TestValidator.equals(
    "created chart title matches input",
    chart.title,
    chartCreateBody.title,
  );
  TestValidator.equals(
    "created chart widget ID matches input",
    chart.flex_office_widget_id,
    chartCreateBody.flex_office_widget_id,
  );

  // 4. Update the chart with new values
  const chartUpdateBody = {
    chart_type: "line",
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 5, wordMax: 12 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 4,
      sentenceMax: 8,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IFlexOfficeChart.IUpdate;

  const updatedChart = await api.functional.flexOffice.editor.charts.update(
    connection,
    {
      chartId: chart.id,
      body: chartUpdateBody,
    },
  );
  typia.assert(updatedChart);
  TestValidator.equals(
    "updated chart title matches input",
    updatedChart.title,
    chartUpdateBody.title,
  );
  TestValidator.equals(
    "updated chart type matches input",
    updatedChart.chart_type,
    chartUpdateBody.chart_type,
  );

  // 5. Attempt update with invalid chartId - expect error
  const invalidChartId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "update with invalid chartId should fail",
    async () => {
      await api.functional.flexOffice.editor.charts.update(connection, {
        chartId: invalidChartId,
        body: {
          title: "Should fail",
        } satisfies IFlexOfficeChart.IUpdate,
      });
    },
  );
}
