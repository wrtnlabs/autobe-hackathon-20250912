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
 * End-to-end test for KPI widget creation by admin user with valid widget
 * dependency.
 *
 * Steps:
 *
 * 1. Admin user joins authentically with email and password
 * 2. Creates a UI page
 * 3. Creates a UI widget on the page
 * 4. Creates KPI widget linked to the UI widget with valid JSON config
 * 5. Validates success of KPI widget creation
 * 6. Tests failure scenarios - invalid config_json, unauthorized access, duplicate
 *    creation
 *
 * Ensures full type validation, format compliance, correct use of required
 * properties, and response shape validation.
 */
export async function test_api_kpi_widget_creation_by_admin_with_valid_widget_dependency(
  connection: api.IConnection,
) {
  // 1. Admin user join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePass123!";
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a UI page
  const pageCreateBody = {
    name: `Page ${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 })}`,
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    status: "draft",
  } satisfies IFlexOfficePage.ICreate;

  const page: IFlexOfficePage =
    await api.functional.flexOffice.admin.pages.create(connection, {
      body: pageCreateBody,
    });
  typia.assert(page);
  TestValidator.predicate(
    "page id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      page.id,
    ),
  );

  // 3. Create a UI widget on the page
  const widgetCreateBody = {
    flex_office_page_id: page.id,
    widget_type: "chart",
    name: `Widget ${RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 6 })}`,
    configuration: JSON.stringify({
      type: "line",
      options: { color: "green" },
    }),
  } satisfies IFlexOfficeWidget.ICreate;

  const widget: IFlexOfficeWidget =
    await api.functional.flexOffice.admin.pages.widgets.create(connection, {
      pageId: page.id,
      body: widgetCreateBody,
    });
  typia.assert(widget);
  TestValidator.equals(
    "widget linked to page",
    widget.flex_office_page_id,
    page.id,
  );
  TestValidator.predicate(
    "widget id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      widget.id,
    ),
  );

  // 4. Create KPI widget linked to created UI widget
  const validKpiConfig = JSON.stringify({
    dataSource: "sales",
    aggregation: "sum",
    display: { unit: "USD" },
  });
  const kpiCreateBody = {
    flex_office_widget_id: widget.id,
    config_json: validKpiConfig,
  } satisfies IFlexOfficeKpiWidget.ICreate;

  const kpiWidget: IFlexOfficeKpiWidget =
    await api.functional.flexOffice.admin.widgets.kpi.create(connection, {
      body: kpiCreateBody,
    });
  typia.assert(kpiWidget);
  TestValidator.equals(
    "kpi widget linked to widget",
    kpiWidget.flex_office_widget_id,
    widget.id,
  );
  TestValidator.equals(
    "kpi config json stored",
    kpiWidget.config_json,
    validKpiConfig,
  );
  TestValidator.predicate(
    "kpi created_at date-time format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(kpiWidget.created_at),
  );
  TestValidator.predicate(
    "kpi updated_at date-time format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(kpiWidget.updated_at),
  );

  // 5. Failure: Invalid JSON in config_json
  await TestValidator.error(
    "invalid JSON config_json should fail",
    async () => {
      await api.functional.flexOffice.admin.widgets.kpi.create(connection, {
        body: {
          flex_office_widget_id: widget.id,
          config_json: "{ invalid json }",
        } satisfies IFlexOfficeKpiWidget.ICreate,
      });
    },
  );

  // 6. Failure: Unauthorized access - create without join/authentication
  {
    // Create unauthenticated connection
    const unauthConn: api.IConnection = { ...connection, headers: {} };
    await TestValidator.error(
      "unauthorized KPI widget creation should fail",
      async () => {
        await api.functional.flexOffice.admin.widgets.kpi.create(unauthConn, {
          body: kpiCreateBody,
        });
      },
    );
  }

  // 7. Failure: Duplicate KPI widget creation for the same widget
  await TestValidator.error(
    "duplicate KPI widget creation should fail",
    async () => {
      await api.functional.flexOffice.admin.widgets.kpi.create(connection, {
        body: kpiCreateBody,
      });
    },
  );
}
