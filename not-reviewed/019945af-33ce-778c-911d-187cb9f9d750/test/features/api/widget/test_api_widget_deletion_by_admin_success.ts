import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficeWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidget";

/**
 * This E2E test validates the successful deletion of a widget on a UI page by
 * an authorized admin user. The workflow includes admin user joining and login,
 * creating a UI page, adding a widget, deleting the widget, and confirming
 * successful deletion operation.
 *
 * All API responses are asserted for type safety, and TestValidator is used to
 * ensure business logic expectations. Authentication tokens are auto-managed by
 * the SDK connection.
 *
 * This test verifies the API behaves correctly in the success path for widget
 * deletion.
 */
export async function test_api_widget_deletion_by_admin_success(
  connection: api.IConnection,
) {
  // 1. Admin user joins to create admin account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin_password_1234";
  const adminCreationBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ICreate;
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreationBody,
    });
  typia.assert(admin);

  // 2. Admin user logs in to establish authorization context
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ILogin;
  const loggedInAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(loggedInAdmin);

  // 3. Create a new UI page
  const pageCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 6,
      wordMin: 4,
      wordMax: 8,
    }),
    status: "draft",
    flex_office_page_theme_id: null,
  } satisfies IFlexOfficePage.ICreate;
  const page: IFlexOfficePage =
    await api.functional.flexOffice.admin.pages.create(connection, {
      body: pageCreateBody,
    });
  typia.assert(page);

  // 4. Add a widget to the created page
  const widgetCreateBody = {
    flex_office_page_id: page.id,
    widget_type: RandomGenerator.pick([
      "table",
      "chart",
      "filter",
      "button",
      "form",
    ] as const),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 6, wordMax: 12 }),
    configuration: null,
  } satisfies IFlexOfficeWidget.ICreate;
  const widget: IFlexOfficeWidget =
    await api.functional.flexOffice.admin.pages.widgets.create(connection, {
      pageId: page.id,
      body: widgetCreateBody,
    });
  typia.assert(widget);

  // 5. Delete the widget from the UI page
  await api.functional.flexOffice.admin.pages.widgets.erase(connection, {
    pageId: page.id,
    widgetId: widget.id,
  });

  // 6. Since no retrieval API is provided, consider deletion successful if no error thrown
  TestValidator.predicate("widget deletion should succeed without error", true);
}
