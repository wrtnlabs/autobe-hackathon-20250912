import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeChart";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";

/**
 * This test scenario verifies the creation of a new FlexOffice chart by an
 * Editor user. It performs Editor user registration (join), login, then creates
 * a chart linked to a valid widget. The chart creation tests correct handling
 * of required and optional properties (title, description). The scenario
 * validates the returned entity fields and the server-generated fields like id
 * and timestamps. Invalid widget reference or missing fields tests are omitted
 * due to strict type safety.
 */
export async function test_api_flexoffice_chart_creation_by_editor_with_valid_widget(
  connection: api.IConnection,
) {
  // 1. Join an editor user
  const editorJoinBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IFlexOfficeEditor.ICreate;
  const joinedEditor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, { body: editorJoinBody });
  typia.assert(joinedEditor);

  // 2. Login as the editor user
  const editorLoginBody = {
    email: editorJoinBody.email,
    password: editorJoinBody.password,
  } satisfies IFlexOfficeEditor.ILogin;
  const loggedInEditor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: editorLoginBody,
    });
  typia.assert(loggedInEditor);

  // 3. Create a chart linked to a valid widget id
  const validWidgetId = typia.random<string & tags.Format<"uuid">>();

  const chartCreateBody = {
    flex_office_widget_id: validWidgetId,
    chart_type: RandomGenerator.pick(["bar", "line", "pie"] as const),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 5,
      wordMax: 15,
    }),
  } satisfies IFlexOfficeChart.ICreate;

  const createdChart: IFlexOfficeChart =
    await api.functional.flexOffice.editor.charts.create(connection, {
      body: chartCreateBody,
    });
  typia.assert(createdChart);

  TestValidator.equals(
    "linked widget ID matches input",
    createdChart.flex_office_widget_id,
    chartCreateBody.flex_office_widget_id,
  );
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

  // Because description is optional and can be null or undefined, normalize both sides to string or null for equality check
  TestValidator.equals(
    "chart description matches input",
    createdChart.description ?? null,
    chartCreateBody.description ?? null,
  );

  TestValidator.predicate(
    "id is non-empty string",
    typeof createdChart.id === "string" && createdChart.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO date-time string",
    typeof createdChart.created_at === "string" &&
      createdChart.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO date-time string",
    typeof createdChart.updated_at === "string" &&
      createdChart.updated_at.length > 0,
  );
}
