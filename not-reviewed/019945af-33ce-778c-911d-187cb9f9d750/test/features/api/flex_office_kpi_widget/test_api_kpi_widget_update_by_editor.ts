import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficeKpiWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeKpiWidget";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficeWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidget";

/**
 * Test the complete update flow of a KPI widget by an editor user.
 *
 * This test covers:
 *
 * - Editor user registration/authentication
 * - UI page creation as a prerequisite
 * - Widget creation on the page
 * - KPI widget creation
 * - Update of the KPI widget
 * - Validation of successful update
 * - Negative tests for unauthorized update and updating non-existent KPI
 *   widget
 */
export async function test_api_kpi_widget_update_by_editor(
  connection: api.IConnection,
) {
  // 1. Editor user registration and authentication
  const editorEmail = typia.random<string & tags.Format<"email">>();
  const editor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: {
        name: RandomGenerator.name(),
        email: editorEmail,
        password: "strongPassword123!",
      } satisfies IFlexOfficeEditor.ICreate,
    });
  typia.assert(editor);

  // 2. Create a UI page as prerequisite
  const pageBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "draft",
  } satisfies IFlexOfficePage.ICreate;
  const page: IFlexOfficePage =
    await api.functional.flexOffice.editor.pages.create(connection, {
      body: pageBody,
    });
  typia.assert(page);

  // 3. Create a widget on the created page
  const widgetBody = {
    flex_office_page_id: page.id,
    widget_type: "chart",
    name: RandomGenerator.name(),
    configuration: JSON.stringify({
      type: "line_chart",
      options: { color: "blue" },
    }),
  } satisfies IFlexOfficeWidget.ICreate;
  const widget: IFlexOfficeWidget =
    await api.functional.flexOffice.editor.pages.widgets.create(connection, {
      pageId: page.id,
      body: widgetBody,
    });
  typia.assert(widget);

  // 4. Create a KPI widget to be updated
  const kpiCreateBody = {
    flex_office_widget_id: widget.id,
    config_json: JSON.stringify({
      metric: "revenue",
      aggregation: "sum",
      period: "monthly",
    }),
  } satisfies IFlexOfficeKpiWidget.ICreate;
  const kpiWidget: IFlexOfficeKpiWidget =
    await api.functional.flexOffice.editor.widgets.kpi.create(connection, {
      body: kpiCreateBody,
    });
  typia.assert(kpiWidget);

  // 5. Perform the KPI widget update
  const kpiUpdateBody = {
    flex_office_widget_id: widget.id,
    config_json: JSON.stringify({
      metric: "profit",
      aggregation: "average",
      period: "quarterly",
      description: "Updated KPI widget config",
    }),
  } satisfies IFlexOfficeKpiWidget.IUpdate;
  const updatedKpiWidget: IFlexOfficeKpiWidget =
    await api.functional.flexOffice.editor.widgets.kpi.update(connection, {
      kpiWidgetId: kpiWidget.id,
      body: kpiUpdateBody,
    });
  typia.assert(updatedKpiWidget);

  // 6. Validate the update persistence
  TestValidator.equals(
    "Updated KPI widget id",
    updatedKpiWidget.id,
    kpiWidget.id,
  );
  TestValidator.equals(
    "Updated KPI widget flex_office_widget_id",
    updatedKpiWidget.flex_office_widget_id,
    widget.id,
  );
  TestValidator.equals(
    "Updated KPI widget config_json",
    updatedKpiWidget.config_json,
    kpiUpdateBody.config_json,
  );

  // 7. Attempt update with non-existent kpiWidgetId - expect failure
  await TestValidator.error(
    "Update non-existent KPI widget should fail",
    async () => {
      await api.functional.flexOffice.editor.widgets.kpi.update(connection, {
        kpiWidgetId: typia.random<string & tags.Format<"uuid">>(), // random non-existent ID
        body: kpiUpdateBody,
      });
    },
  );

  // 8. Attempt update without authentication - expect failure
  // Create unauthenticated connection by clearing headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthorized update attempt should fail",
    async () => {
      await api.functional.flexOffice.editor.widgets.kpi.update(unauthConn, {
        kpiWidgetId: kpiWidget.id,
        body: kpiUpdateBody,
      });
    },
  );
}
