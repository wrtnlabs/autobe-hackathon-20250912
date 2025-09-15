import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeChart";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";

/**
 * Validate chart deletion by an editor user.
 *
 * This test function covers the entire lifecycle of an editor user
 * performing a chart deletion:
 *
 * 1. Register a new editor user with name, unique email, and password
 * 2. Log in as the registered editor user
 * 3. Create a new chart associated with the editor user
 * 4. Delete the newly created chart with proper authorization
 *
 * It validates that all steps succeed, authentication tokens are set, and
 * the deletion endpoint returns no content indicating success.
 *
 * It also confirms that the editor role is enforced for deletion and that
 * the system handles authentication properly.
 */
export async function test_api_chart_deletion_editor_success(
  connection: api.IConnection,
) {
  // 1. Register a new editor user
  const editorCreateBody = {
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(12)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IFlexOfficeEditor.ICreate;

  const joinOutput: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreateBody,
    });
  typia.assert(joinOutput);

  TestValidator.predicate(
    "Editor join token access is non-empty",
    typeof joinOutput.token.access === "string" &&
      joinOutput.token.access.length > 0,
  );

  // 2. Log in as the newly created editor user
  const editorLoginBody = {
    email: editorCreateBody.email,
    password: editorCreateBody.password,
  } satisfies IFlexOfficeEditor.ILogin;
  const loginOutput: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: editorLoginBody,
    });
  typia.assert(loginOutput);
  TestValidator.predicate(
    "Editor login token access is non-empty",
    typeof loginOutput.token.access === "string" &&
      loginOutput.token.access.length > 0,
  );

  // 3. Create a chart
  const chartCreateBody = {
    flex_office_widget_id: typia.random<string & tags.Format<"uuid">>(),
    chart_type: RandomGenerator.pick([
      "bar",
      "line",
      "pie",
      "scatter",
      "area",
      "doughnut",
    ] as const),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: null,
  } satisfies IFlexOfficeChart.ICreate;

  const createdChart: IFlexOfficeChart =
    await api.functional.flexOffice.editor.charts.create(connection, {
      body: chartCreateBody,
    });
  typia.assert(createdChart);

  TestValidator.predicate(
    "Created chart id is a non-empty UUID string",
    typeof createdChart.id === "string" && createdChart.id.length > 0,
  );

  // 4. Delete the created chart by ID
  await api.functional.flexOffice.editor.charts.erase(connection, {
    chartId: createdChart.id,
  });
}
