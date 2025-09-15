import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeChart } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeChart";
import type { IFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeViewer";

export async function test_api_chart_creation_by_viewer_user(
  connection: api.IConnection,
) {
  // 1. Register a new viewer user
  const viewerCreateBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassword123!",
  } satisfies IFlexOfficeViewer.ICreate;

  const viewerAuthorized: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.join(connection, {
      body: viewerCreateBody,
    });
  typia.assert(viewerAuthorized);
  TestValidator.predicate(
    "viewer authorized token is non-empty",
    viewerAuthorized.token.access.length > 0 &&
      viewerAuthorized.token.refresh.length > 0,
  );

  // 2. Log in the newly created viewer user
  const viewerLoginBody = {
    email: viewerCreateBody.email,
    password: viewerCreateBody.password,
  } satisfies IFlexOfficeViewer.ILogin;

  const loggedIn: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.login(connection, {
      body: viewerLoginBody,
    });
  typia.assert(loggedIn);
  TestValidator.predicate(
    "viewer login token is non-empty",
    loggedIn.token.access.length > 0 && loggedIn.token.refresh.length > 0,
  );

  // 3. Create a new analytics chart linked to a widget
  // Generate fake widget ID as UUID (assuming the user owns this widget)
  const fakeWidgetId = typia.random<string & tags.Format<"uuid">>();

  const chartCreateBody = {
    flex_office_widget_id: fakeWidgetId,
    chart_type: RandomGenerator.pick(["bar", "line", "pie"] as const),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 9 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IFlexOfficeChart.ICreate;

  const chart: IFlexOfficeChart =
    await api.functional.flexOffice.viewer.charts.create(connection, {
      body: chartCreateBody,
    });
  typia.assert(chart);

  TestValidator.equals(
    "chart flex_office_widget_id matches request",
    chart.flex_office_widget_id,
    chartCreateBody.flex_office_widget_id,
  );

  TestValidator.equals(
    "chart chart_type matches request",
    chart.chart_type,
    chartCreateBody.chart_type,
  );
  TestValidator.equals(
    "chart title matches request",
    chart.title,
    chartCreateBody.title,
  );

  if (
    chartCreateBody.description === null ||
    chartCreateBody.description === undefined
  ) {
    TestValidator.equals(
      "chart description is null or undefined",
      chart.description,
      chartCreateBody.description ?? null,
    );
  } else {
    TestValidator.equals(
      "chart description matches request",
      chart.description,
      chartCreateBody.description,
    );
  }

  TestValidator.predicate(
    "chart id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      chart.id,
    ),
  );

  TestValidator.predicate(
    "chart created_at is date-time format",
    !isNaN(Date.parse(chart.created_at)),
  );

  TestValidator.predicate(
    "chart updated_at is date-time format",
    !isNaN(Date.parse(chart.updated_at)),
  );

  TestValidator.predicate(
    "chart deleted_at is null or date-time if present",
    chart.deleted_at === null ||
      chart.deleted_at === undefined ||
      !isNaN(Date.parse(chart.deleted_at!)),
  );

  // 4. Test error handling: attempt to create chart without authentication
  // Use a fresh connection without Authorization header
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated chart creation should be rejected",
    async () => {
      await api.functional.flexOffice.viewer.charts.create(
        unauthenticatedConnection,
        {
          body: chartCreateBody,
        },
      );
    },
  );
}
