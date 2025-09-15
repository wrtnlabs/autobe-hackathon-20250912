import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficeWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidget";

/**
 * This E2E test validates the complete flow for updating a UI widget on a
 * FlexOffice admin page.
 *
 * The test begins with creating and authenticating an admin user via
 * /auth/admin/join and /auth/admin/login, ensuring the necessary authorization
 * context for admin operations. Subsequently, it creates a FlexOffice UI page,
 * then creates a widget on the page. The core update test performs a PUT
 * request to modify widget properties, validating that updated properties and
 * timestamps are correctly returned and linked.
 *
 * Negative tests confirm authorization enforcement and input validation by
 * attempting to update widgets with unauthorized headers and invalid request
 * bodies.
 *
 * This comprehensive scenario tests the robustness, data integrity, and
 * security of the widget update API.
 */
export async function test_api_flexoffice_admin_pages_widgets_update_successful_flow(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: adminEmail,
    password: "AdminPass123!",
  } satisfies IFlexOfficeAdmin.ICreate;
  const adminAuth: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(adminAuth);

  // 2. Admin login
  const loginBody = {
    email: adminEmail,
    password: "AdminPass123!",
  } satisfies IFlexOfficeAdmin.ILogin;
  const loginAuth: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: loginBody });
  typia.assert(loginAuth);

  // 3. Create UI Page
  const pageCreateBody = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "draft",
  } satisfies IFlexOfficePage.ICreate;

  const page: IFlexOfficePage =
    await api.functional.flexOffice.admin.pages.create(connection, {
      body: pageCreateBody,
    });
  typia.assert(page);
  TestValidator.predicate(
    "page id is uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      page.id,
    ),
  );

  // 4. Create Widget on Page
  const widgetCreateBody = {
    flex_office_page_id: page.id,
    widget_type: RandomGenerator.pick([
      "table",
      "chart",
      "filter",
      "button",
      "form",
    ] as const),
    name: RandomGenerator.name(),
    configuration: JSON.stringify({
      configKey: "configValue",
      count: typia.random<number>(),
    }),
  } satisfies IFlexOfficeWidget.ICreate;

  const widget: IFlexOfficeWidget =
    await api.functional.flexOffice.admin.pages.widgets.create(connection, {
      pageId: page.id,
      body: widgetCreateBody,
    });
  typia.assert(widget);
  TestValidator.equals(
    "widget.pageId matches page.id",
    widget.flex_office_page_id,
    page.id,
  );

  // 5. Update Widget
  const widgetUpdateBody = {
    name: RandomGenerator.name(),
    widget_type: RandomGenerator.pick([
      "table",
      "chart",
      "filter",
      "button",
      "form",
    ] as const),
    configuration: JSON.stringify({
      updated: true,
      timestamp: new Date().toISOString(),
    }),
  } satisfies IFlexOfficeWidget.IUpdate;

  const updatedWidget: IFlexOfficeWidget =
    await api.functional.flexOffice.admin.pages.widgets.update(connection, {
      pageId: page.id,
      widgetId: widget.id,
      body: widgetUpdateBody,
    });
  typia.assert(updatedWidget);

  // 6. Verify updated data correctness
  TestValidator.equals(
    "updated widget id matches original",
    updatedWidget.id,
    widget.id,
  );
  TestValidator.equals(
    "updated widget pageId unchanged",
    updatedWidget.flex_office_page_id,
    widget.flex_office_page_id,
  );
  TestValidator.equals(
    "updated widget name changed",
    updatedWidget.name,
    widgetUpdateBody.name,
  );
  TestValidator.equals(
    "updated widget type changed",
    updatedWidget.widget_type,
    widgetUpdateBody.widget_type,
  );
  TestValidator.equals(
    "updated widget configuration changed",
    updatedWidget.configuration,
    widgetUpdateBody.configuration,
  );

  TestValidator.predicate(
    "created_at is ISO datetime format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      updatedWidget.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO datetime format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      updatedWidget.updated_at,
    ),
  );

  // 7. Negative test: unauthorized update attempt (simulate no auth by fresh connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized update should fail", async () => {
    await api.functional.flexOffice.admin.pages.widgets.update(unauthConn, {
      pageId: page.id,
      widgetId: widget.id,
      body: widgetUpdateBody,
    });
  });

  // 8. Negative test: invalid update (empty body)
  await TestValidator.error("update with empty body should fail", async () => {
    await api.functional.flexOffice.admin.pages.widgets.update(connection, {
      pageId: page.id,
      widgetId: widget.id,
      body: {},
    });
  });
}
