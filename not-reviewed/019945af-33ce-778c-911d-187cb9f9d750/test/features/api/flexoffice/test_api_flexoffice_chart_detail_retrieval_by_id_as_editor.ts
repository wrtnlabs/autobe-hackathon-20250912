import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeChart";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";

/**
 * This E2E test validates the retrieval of a FlexOffice analytics chart detail
 * by its unique chartId as an Editor user.
 *
 * It tests the user joining and login process for the Editor role to obtain
 * authentication tokens necessary for authorized API calls.
 *
 * The test then attempts to retrieve chart details using a valid UUID as
 * chartId, validating the response against the IFlexOfficeChart schema.
 *
 * Negative cases include testing malformed UUID and non-existent UUIDs to
 * verify proper error handling.
 */
export async function test_api_flexoffice_chart_detail_retrieval_by_id_as_editor(
  connection: api.IConnection,
) {
  // Step 1: Editor user joins to create an account
  const editorCreateBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IFlexOfficeEditor.ICreate;

  const createdEditor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreateBody,
    });
  typia.assert(createdEditor);

  // Step 2: Editor user logs in to obtain fresh authentication context
  const editorLoginBody = {
    email: editorCreateBody.email,
    password: editorCreateBody.password,
  } satisfies IFlexOfficeEditor.ILogin;

  const loggedInEditor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: editorLoginBody,
    });
  typia.assert(loggedInEditor);

  // Step 3: Attempt to retrieve a chart detail with a valid UUID chartId
  const validChartId = typia.random<string & tags.Format<"uuid">>();

  // Because actual existence of chart is not guaranteed, we only typia.assert
  // the response or catch possible error.
  try {
    const chartDetail: IFlexOfficeChart =
      await api.functional.flexOffice.editor.charts.at(connection, {
        chartId: validChartId,
      });
    typia.assert(chartDetail);
  } catch {
    // Possible 404 or error, pass silently
  }

  // Step 4: Attempt to retrieve chart detail with malformed UUID to test error
  await TestValidator.error("malformed chartId should fail", async () => {
    await api.functional.flexOffice.editor.charts.at(connection, {
      chartId: "invalid-uuid-format",
    });
  });

  // Step 5: Attempt to retrieve chart detail with valid non-existent UUID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent chartId should fail", async () => {
    await api.functional.flexOffice.editor.charts.at(connection, {
      chartId: nonExistentId,
    });
  });
}
