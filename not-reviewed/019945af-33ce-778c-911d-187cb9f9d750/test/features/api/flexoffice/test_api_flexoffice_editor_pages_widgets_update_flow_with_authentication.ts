import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficeWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidget";

/**
 * Test the full update workflow of a widget on a FlexOffice UI page with
 * authenticated editor user.
 *
 * Workflow steps:
 *
 * 1. Editor user joins (register) and is authorized.
 * 2. Editor user logs in and refreshes auth token.
 * 3. Create a FlexOffice UI page.
 * 4. Create a widget on the created page.
 * 5. Update the widget using PUT
 *    /flexOffice/editor/pages/{pageId}/widgets/{widgetId}.
 * 6. Validate that the widget update is persisted correctly.
 * 7. Test unauthorized update attempt.
 * 8. Test update with invalid pageId and widgetId.
 * 9. Test update with empty update body.
 */
export async function test_api_flexoffice_editor_pages_widgets_update_flow_with_authentication(
  connection: api.IConnection,
) {
  // 1. Editor user joins
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

  // 2. Editor user logs in
  const editorLoginBody = {
    email: editorCreateBody.email,
    password: editorCreateBody.password,
  } satisfies IFlexOfficeEditor.ILogin;

  const editorLoginAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: editorLoginBody,
    });
  typia.assert(editorLoginAuthorized);

  // 3. Create a UI page
  const pageCreateBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({
      sentences: 3,
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

  // 4. Create a widget on the page
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
      config: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 7,
      }),
    }),
  } satisfies IFlexOfficeWidget.ICreate;

  const widget: IFlexOfficeWidget =
    await api.functional.flexOffice.editor.pages.widgets.create(connection, {
      pageId: page.id,
      body: widgetCreateBody,
    });
  typia.assert(widget);

  // 5. Update the widget
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
      updatedConfig: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 4,
        wordMax: 9,
      }),
    }),
  } satisfies IFlexOfficeWidget.IUpdate;

  const updatedWidget: IFlexOfficeWidget =
    await api.functional.flexOffice.editor.pages.widgets.update(connection, {
      pageId: page.id,
      widgetId: widget.id,
      body: widgetUpdateBody,
    });
  typia.assert(updatedWidget);

  // Validate updated properties
  TestValidator.equals("widget id unchanged", updatedWidget.id, widget.id);
  TestValidator.equals(
    "widget page id unchanged",
    updatedWidget.flex_office_page_id,
    widget.flex_office_page_id,
  );
  TestValidator.equals(
    "widget name updated",
    updatedWidget.name,
    widgetUpdateBody.name!,
  );
  TestValidator.equals(
    "widget type updated",
    updatedWidget.widget_type,
    widgetUpdateBody.widget_type!,
  );
  TestValidator.equals(
    "widget configuration updated",
    updatedWidget.configuration,
    widgetUpdateBody.configuration,
  );

  // Validate timestamps exist
  TestValidator.predicate(
    "widget created_at exists",
    typeof updatedWidget.created_at === "string",
  );
  TestValidator.predicate(
    "widget updated_at exists",
    typeof updatedWidget.updated_at === "string",
  );

  // 6. Negative tests for unauthorized update
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized update blocked", async () => {
    await api.functional.flexOffice.editor.pages.widgets.update(
      unauthConnection,
      {
        pageId: page.id,
        widgetId: widget.id,
        body: widgetUpdateBody,
      },
    );
  });

  // 7. Negative test invalid pageId
  await TestValidator.error("update with invalid pageId blocked", async () => {
    await api.functional.flexOffice.editor.pages.widgets.update(connection, {
      pageId: "00000000-0000-0000-0000-000000000000",
      widgetId: widget.id,
      body: widgetUpdateBody,
    });
  });

  // 8. Negative test invalid widgetId
  await TestValidator.error(
    "update with invalid widgetId blocked",
    async () => {
      await api.functional.flexOffice.editor.pages.widgets.update(connection, {
        pageId: page.id,
        widgetId: "00000000-0000-0000-0000-000000000000",
        body: widgetUpdateBody,
      });
    },
  );

  // 9. Negative test empty update body
  await TestValidator.error("update with empty body blocked", async () => {
    await api.functional.flexOffice.editor.pages.widgets.update(connection, {
      pageId: page.id,
      widgetId: widget.id,
      body: {},
    });
  });
}
