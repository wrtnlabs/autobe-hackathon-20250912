import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeKpiWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeKpiWidget";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficeWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidget";

/**
 * Validates updating an existing KPI widget by an admin user.
 *
 * Steps:
 *
 * 1. Admin Authentication (join to acquire authorization token).
 * 2. Create a FlexOffice UI page prerequisite.
 * 3. Create a Widget on the created UI page prerequisite.
 * 4. Create a KPI widget linked to the widget.
 * 5. Update the KPI widget's configuration and linked widget ID.
 * 6. Validate that the update response matches the update input.
 * 7. Test failure cases:
 *
 *    - Updating with non-existent KPI widget ID (expect error).
 *    - Updating with invalid update body data (e.g., empty config_json).
 *    - Updating without admin authentication (using fresh connection without
 *         token).
 * 8. Clean up test-created entities (if applicable).
 */
export async function test_api_kpi_widget_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins to authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "test-password",
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a UI page
  const pageBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    status: "draft",
  } satisfies IFlexOfficePage.ICreate;
  const page = await api.functional.flexOffice.admin.pages.create(connection, {
    body: pageBody,
  });
  typia.assert(page);

  // 3. Create a widget on the created page
  const widgetBody = {
    flex_office_page_id: page.id,
    widget_type: "kpi",
    name: RandomGenerator.name(),
    configuration: JSON.stringify({ display: "default" }),
  } satisfies IFlexOfficeWidget.ICreate;
  const widget = await api.functional.flexOffice.admin.pages.widgets.create(
    connection,
    { pageId: page.id, body: widgetBody },
  );
  typia.assert(widget);

  // 4. Create a KPI widget linked to the widget
  const kpiWidgetBody = {
    flex_office_widget_id: widget.id,
    config_json: JSON.stringify({ metric: "revenue", aggregation: "sum" }),
  } satisfies IFlexOfficeKpiWidget.ICreate;
  const kpiWidget = await api.functional.flexOffice.admin.widgets.kpi.create(
    connection,
    { body: kpiWidgetBody },
  );
  typia.assert(kpiWidget);

  // 5. Update the KPI widget's configuration and linked widget ID
  const updatedConfig = JSON.stringify({
    metric: "orders",
    aggregation: "count",
  });
  const updatedWidgetBody = {
    flex_office_page_id: page.id,
    widget_type: "kpi",
    name: RandomGenerator.name(),
    configuration: JSON.stringify({ display: "enhanced" }),
  } satisfies IFlexOfficeWidget.ICreate;
  const anotherWidget =
    await api.functional.flexOffice.admin.pages.widgets.create(connection, {
      pageId: page.id,
      body: updatedWidgetBody,
    });
  typia.assert(anotherWidget);

  const updateBody = {
    flex_office_widget_id: anotherWidget.id,
    config_json: updatedConfig,
  } satisfies IFlexOfficeKpiWidget.IUpdate;
  const updatedKpiWidget =
    await api.functional.flexOffice.admin.widgets.kpi.update(connection, {
      kpiWidgetId: kpiWidget.id,
      body: updateBody,
    });
  typia.assert(updatedKpiWidget);
  TestValidator.equals(
    "KPI widget id unchanged",
    updatedKpiWidget.id,
    kpiWidget.id,
  );
  TestValidator.equals(
    "KPI widget flex_office_widget_id updated",
    updatedKpiWidget.flex_office_widget_id,
    anotherWidget.id,
  );
  TestValidator.equals(
    "KPI widget config_json updated",
    updatedKpiWidget.config_json,
    updatedConfig,
  );

  // 6. Failure case: update with invalid KPI ID
  await TestValidator.error(
    "update with non-existent KPI widget id should fail",
    async () => {
      await api.functional.flexOffice.admin.widgets.kpi.update(connection, {
        kpiWidgetId: typia.random<string & tags.Format<"uuid">>(),
        body: updateBody,
      });
    },
  );

  // 7. Failure case: update with invalid data (empty config_json)
  await TestValidator.error(
    "update with empty config_json should fail",
    async () => {
      await api.functional.flexOffice.admin.widgets.kpi.update(connection, {
        kpiWidgetId: kpiWidget.id,
        body: {
          config_json: "",
        },
      });
    },
  );

  // 8. Failure case: update without admin auth
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("update without auth should fail", async () => {
    await api.functional.flexOffice.admin.widgets.kpi.update(unauthConnection, {
      kpiWidgetId: kpiWidget.id,
      body: updateBody,
    });
  });
}
