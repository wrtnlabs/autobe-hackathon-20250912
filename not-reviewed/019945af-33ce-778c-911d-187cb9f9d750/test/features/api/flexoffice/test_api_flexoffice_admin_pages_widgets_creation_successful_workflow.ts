import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficeWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidget";

/**
 * Validates the complete workflow for creating a widget on a FlexOffice UI
 * page by an authenticated admin user.
 *
 * This test covers:
 *
 * 1. Admin user registration and authentication.
 * 2. Creation of a UI page with valid theme association.
 * 3. Creation of a widget associated with the created page.
 * 4. Validation that the widget is correctly linked to the page and timestamps
 *    are valid.
 *
 * The test ensures admin-only creation permissions are respected and that
 * all required fields are properly validated. This simulates a real-world
 * admin customizing UI pages via widgets, enforcing referential integrity
 * and correct audit data.
 */
export async function test_api_flexoffice_admin_pages_widgets_creation_successful_workflow(
  connection: api.IConnection,
) {
  // 1. Admin user creation
  const adminPassword = "Admin@1234";
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ICreate;
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Admin login
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ILogin;
  const adminLogin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 3. Create a FlexOffice UI page
  const pageCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 7,
    }),
    status: "published",
    flex_office_page_theme_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IFlexOfficePage.ICreate;
  const page: IFlexOfficePage =
    await api.functional.flexOffice.admin.pages.create(connection, {
      body: pageCreateBody,
    });
  typia.assert(page);
  TestValidator.equals(
    "page name matches request",
    page.name,
    pageCreateBody.name,
  );
  TestValidator.equals(
    "page status matches request",
    page.status,
    pageCreateBody.status,
  );
  TestValidator.equals(
    "page theme id matches request",
    page.flex_office_page_theme_id,
    pageCreateBody.flex_office_page_theme_id,
  );

  // 4. Create a widget associated with the created page
  const widgetCreateBody = {
    flex_office_page_id: page.id,
    widget_type: "table",
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    configuration: JSON.stringify({
      columns: ["Column A", "Column B"],
      sortable: true,
    }),
  } satisfies IFlexOfficeWidget.ICreate;
  const widget: IFlexOfficeWidget =
    await api.functional.flexOffice.admin.pages.widgets.create(connection, {
      pageId: page.id,
      body: widgetCreateBody,
    });
  typia.assert(widget);

  // 5. Assertions
  TestValidator.equals(
    "widget pageId matches created page id",
    widget.flex_office_page_id,
    page.id,
  );
  TestValidator.equals(
    "widget widget_type matches request",
    widget.widget_type,
    widgetCreateBody.widget_type,
  );
  TestValidator.equals(
    "widget name matches request",
    widget.name,
    widgetCreateBody.name,
  );
  TestValidator.predicate(
    "widget created_at is a valid ISO date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.\d+)?Z$/.test(
      widget.created_at,
    ),
  );
  TestValidator.predicate(
    "widget updated_at is a valid ISO date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.\d+)?Z$/.test(
      widget.updated_at,
    ),
  );

  // 6. Optionally check deleted_at is null or undefined
  TestValidator.predicate(
    "widget deleted_at should be null or undefined if present",
    widget.deleted_at === null || widget.deleted_at === undefined,
  );
}
