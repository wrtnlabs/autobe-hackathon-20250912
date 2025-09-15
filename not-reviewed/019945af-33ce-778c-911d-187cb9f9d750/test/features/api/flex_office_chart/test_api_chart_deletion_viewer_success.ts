import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeChart";
import type { IFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeViewer";

/**
 * Test suite for viewer user flow to create and delete charts with proper
 * authorization.
 *
 * This test covers a full flow for a user with viewer role:
 *
 * 1. Registration to create viewer account and obtain JWT token.
 * 2. Login to confirm JWT token acquisition.
 * 3. Chart creation with valid widget Id and chart data.
 * 4. Deletion of the created chart to ensure proper authorization and
 *    operation success.
 *
 * Validation ensures:
 *
 * - Tokens are valid and assigned properly to connection headers.
 * - Created chart has an ID and proper structure.
 * - Deletion succeeds without error or output.
 *
 * This test validates that a viewer can manage their charts according to
 * role permissions.
 */
export async function test_api_chart_deletion_viewer_success(
  connection: api.IConnection,
) {
  // 1. Register a new viewer user account
  const joinBody = {
    name: RandomGenerator.name(),
    email: `${RandomGenerator.name(1).replace(/\s+/g, ".").trim().toLowerCase()}@example.com`,
    password: "P@ssw0rd1234",
  } satisfies IFlexOfficeViewer.ICreate;

  const authorizedJoin: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.join(connection, { body: joinBody });
  typia.assert(authorizedJoin);
  TestValidator.predicate(
    "Viewer join token access exists",
    typeof authorizedJoin.token.access === "string" &&
      authorizedJoin.token.access.length > 0,
  );

  // 2. Login as the viewer user
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IFlexOfficeViewer.ILogin;

  const authorizedLogin: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.login(connection, { body: loginBody });
  typia.assert(authorizedLogin);
  TestValidator.predicate(
    "Viewer login token access exists",
    typeof authorizedLogin.token.access === "string" &&
      authorizedLogin.token.access.length > 0,
  );

  // 3. Create a new flexOffice chart
  const createBody = {
    flex_office_widget_id: typia.random<string & tags.Format<"uuid">>(),
    chart_type: RandomGenerator.pick(["bar", "line", "pie"] as const),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 6,
      wordMax: 12,
    }),
  } satisfies IFlexOfficeChart.ICreate;

  const createdChart: IFlexOfficeChart =
    await api.functional.flexOffice.viewer.charts.create(connection, {
      body: createBody,
    });
  typia.assert(createdChart);
  TestValidator.predicate(
    "Created chart has id",
    typeof createdChart.id === "string" && createdChart.id.length > 0,
  );
  TestValidator.equals(
    "Created chart title matches",
    createdChart.title,
    createBody.title,
  );

  // 4. Delete the created chart
  await api.functional.flexOffice.viewer.charts.erase(connection, {
    chartId: createdChart.id,
  });

  // Confirm no errors thrown and operation succeeds
  // No output expected from erase (void)
}
