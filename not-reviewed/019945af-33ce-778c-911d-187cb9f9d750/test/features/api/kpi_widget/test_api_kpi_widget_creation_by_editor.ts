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
 * This E2E test function validates the scenario where an editor user
 * successfully creates a KPI widget in the FlexOffice system, following all
 * prerequisite authentication and resource creation steps.
 *
 * The test covers:
 *
 * 1. Editor registration and authentication
 * 2. UI page creation
 * 3. UI widget creation on the created page
 * 4. KPI widget creation linking the widget
 * 5. Validation of response objects with typia.assert
 * 6. Authorization error testing for unauthorized KPI widget creation
 * 7. Validation error testing for invalid config JSON
 *
 * All API calls use proper await and adhere strictly to the API contracts.
 * All validation errors are asserted properly.
 */
export async function test_api_kpi_widget_creation_by_editor(
  connection: api.IConnection,
) {
  // 1. Editor user registration and authentication
  const editorCreateBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IFlexOfficeEditor.ICreate;

  const editorAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreateBody,
    });
  typia.assert(editorAuthorized);

  // 2. Create a UI page as prerequisite
  const pageCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 4,
      wordMax: 10,
    }),
    status: "draft",
  } satisfies IFlexOfficePage.ICreate;

  const page: IFlexOfficePage =
    await api.functional.flexOffice.editor.pages.create(connection, {
      body: pageCreateBody,
    });
  typia.assert(page);
  TestValidator.equals("page name matches", page.name, pageCreateBody.name);

  // 3. Create a UI widget linked to the page
  const widgetCreateBody = {
    flex_office_page_id: page.id,
    widget_type: "kpi",
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 7 }),
    configuration: JSON.stringify({ metric: "revenue", period: "Q1" }),
  } satisfies IFlexOfficeWidget.ICreate;

  const widget: IFlexOfficeWidget =
    await api.functional.flexOffice.editor.pages.widgets.create(connection, {
      pageId: page.id,
      body: widgetCreateBody,
    });
  typia.assert(widget);
  TestValidator.equals(
    "widget page ID matches",
    widget.flex_office_page_id,
    page.id,
  );

  // 4. Create KPI widget linking to the created widget
  const kpiWidgetCreateBody = {
    flex_office_widget_id: widget.id,
    config_json: JSON.stringify({
      data_source: "sales_database",
      aggregation: "sum",
      display_title: "Q1 Revenue",
      currency: "USD",
    }),
  } satisfies IFlexOfficeKpiWidget.ICreate;

  const kpiWidget: IFlexOfficeKpiWidget =
    await api.functional.flexOffice.editor.widgets.kpi.create(connection, {
      body: kpiWidgetCreateBody,
    });
  typia.assert(kpiWidget);
  TestValidator.equals(
    "KPI widget linked widget ID matches",
    kpiWidget.flex_office_widget_id,
    widget.id,
  );

  // 5. Error test: Try KPI creation without authorization (simulate unauthenticated connection)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "KPI widget create fails without authorization",
    async () => {
      await api.functional.flexOffice.editor.widgets.kpi.create(
        unauthenticatedConnection,
        { body: kpiWidgetCreateBody },
      );
    },
  );

  // 6. Error test: Invalid empty config json string
  await TestValidator.error(
    "KPI widget create fails with empty config_json",
    async () => {
      await api.functional.flexOffice.editor.widgets.kpi.create(connection, {
        body: {
          flex_office_widget_id: widget.id,
          config_json: "",
        },
      });
    },
  );
}
