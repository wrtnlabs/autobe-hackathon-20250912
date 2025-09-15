import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficeWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidget";
import type { IFlexOfficeWidgetScript } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidgetScript";

/**
 * Test retrieval of detailed information for a widget script by an editor
 * user.
 *
 * This test covers the full workflow:
 *
 * 1. Editor user joins and authenticates
 * 2. Login as editor
 * 3. Create a UI page
 * 4. Add a widget to the page
 * 5. Add a script to the widget
 * 6. Retrieve detailed info for the created script
 * 7. Validate retrieved data matches created script
 * 8. Confirm error handling for non-existent widget or script
 */
export async function test_api_widget_script_detail_by_editor_success(
  connection: api.IConnection,
) {
  // 1. Editor user joins the system
  const editorJoinBody = {
    name: RandomGenerator.name(),
    email: `${RandomGenerator.name(1)}@example.com`,
    password: "Password123!",
  } satisfies IFlexOfficeEditor.ICreate;
  const editor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorJoinBody,
    });
  typia.assert(editor);

  // 2. Editor user logs in
  const editorLoginBody = {
    email: editorJoinBody.email,
    password: editorJoinBody.password,
  } satisfies IFlexOfficeEditor.ILogin;
  await api.functional.auth.editor.login(connection, {
    body: editorLoginBody,
  });

  // 3. Create a UI page
  const pageCreateBody = {
    name: `Page ${RandomGenerator.name()}`,
    description: `Description ${RandomGenerator.paragraph({ sentences: 3 })}`,
    status: "draft",
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
    name: `Widget ${RandomGenerator.name()}`,
    configuration: null,
  } satisfies IFlexOfficeWidget.ICreate;
  const widget: IFlexOfficeWidget =
    await api.functional.flexOffice.editor.pages.widgets.create(connection, {
      pageId: page.id,
      body: widgetCreateBody,
    });
  typia.assert(widget);

  // 5. Add a script to the widget
  const scriptCreateBody = {
    flex_office_widget_id: widget.id,
    script_type: "javascript",
    script_content: `console.log('Hello from test script');`,
  } satisfies IFlexOfficeWidgetScript.ICreate;
  const script: IFlexOfficeWidgetScript =
    await api.functional.flexOffice.editor.widgets.scripts.create(connection, {
      widgetId: widget.id,
      body: scriptCreateBody,
    });
  typia.assert(script);

  // 6. Retrieve the widget script detail
  const scriptDetail: IFlexOfficeWidgetScript =
    await api.functional.flexOffice.editor.widgets.scripts.at(connection, {
      widgetId: widget.id,
      scriptId: script.id,
    });
  typia.assert(scriptDetail);

  // 7. Validate the retrieved script matches the created script
  TestValidator.equals(
    "widget script id should match",
    scriptDetail.id,
    script.id,
  );
  TestValidator.equals(
    "widget id matches",
    scriptDetail.flex_office_widget_id,
    widget.id,
  );
  TestValidator.equals(
    "script type matches",
    scriptDetail.script_type,
    scriptCreateBody.script_type,
  );
  TestValidator.equals(
    "script content matches",
    scriptDetail.script_content,
    scriptCreateBody.script_content,
  );

  // 8. Error scenarios - retrieving non-existent script
  const invalidUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "get script detail with invalid widget id should fail",
    async () => {
      await api.functional.flexOffice.editor.widgets.scripts.at(connection, {
        widgetId: invalidUuid,
        scriptId: script.id,
      });
    },
  );
  await TestValidator.error(
    "get script detail with invalid script id should fail",
    async () => {
      await api.functional.flexOffice.editor.widgets.scripts.at(connection, {
        widgetId: widget.id,
        scriptId: invalidUuid,
      });
    },
  );
}
