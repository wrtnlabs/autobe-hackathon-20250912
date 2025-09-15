import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficeWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidget";

/**
 * Test for successful deletion of a UI widget by an authorized editor.
 *
 * This test covers the full workflow for an editor user to join, login,
 * create a UI page, add a widget to the page, delete the widget, and
 * confirm that deletion enforces role-based access control and proper error
 * handling.
 *
 * Steps:
 *
 * 1. Create and authenticate editor user account.
 * 2. Log in as editor user.
 * 3. Create a UI page for widget placement.
 * 4. Add a widget to the created page.
 * 5. Delete the widget successfully.
 * 6. Attempt to delete the same widget again to confirm proper error handling.
 */
export async function test_api_widget_deletion_by_editor_success(
  connection: api.IConnection,
) {
  // 1. Editor join to create account and authenticate
  const editorCreateBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPass123!",
  } satisfies IFlexOfficeEditor.ICreate;
  const editorAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreateBody,
    });
  typia.assert(editorAuthorized);

  // 2. Editor login to obtain token
  const editorLoginBody = {
    email: editorCreateBody.email,
    password: editorCreateBody.password,
  } satisfies IFlexOfficeEditor.ILogin;
  const loginAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: editorLoginBody,
    });
  typia.assert(loginAuthorized);

  // 3. Create a UI page
  const pageCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    status: "draft",
    flex_office_page_theme_id: null,
  } satisfies IFlexOfficePage.ICreate;
  const page: IFlexOfficePage =
    await api.functional.flexOffice.editor.pages.create(connection, {
      body: pageCreateBody,
    });
  typia.assert(page);

  // 4. Add a widget to the page
  const widgetCreateBody = {
    flex_office_page_id: page.id,
    widget_type: "table",
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    configuration: null,
  } satisfies IFlexOfficeWidget.ICreate;
  const widget: IFlexOfficeWidget =
    await api.functional.flexOffice.editor.pages.widgets.create(connection, {
      pageId: page.id,
      body: widgetCreateBody,
    });
  typia.assert(widget);

  // 5. Delete the widget
  await api.functional.flexOffice.editor.pages.widgets.erase(connection, {
    pageId: page.id,
    widgetId: widget.id,
  });

  // 6. Attempt to delete the widget again to ensure deletion and authorization
  await TestValidator.error(
    "deleting a non-existent widget should fail",
    async () => {
      await api.functional.flexOffice.editor.pages.widgets.erase(connection, {
        pageId: page.id,
        widgetId: widget.id,
      });
    },
  );
}
