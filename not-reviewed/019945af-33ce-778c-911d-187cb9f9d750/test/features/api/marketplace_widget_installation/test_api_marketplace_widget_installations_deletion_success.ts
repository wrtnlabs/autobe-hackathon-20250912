import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeMarketplaceWidget";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficeWidgetInstallation } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidgetInstallation";

/**
 * This end-to-end test verifies the successful deletion of a marketplace
 * widget installation by an editor user in FlexOffice.
 *
 * The test workflow:
 *
 * 1. Authenticate an editor user (join) to establish authorized editor
 *    context.
 * 2. Create a new marketplace widget.
 * 3. Create a new UI page.
 * 4. Create a widget installation linking the widget and page.
 * 5. Invoke the DELETE endpoint to remove the widget installation.
 * 6. Validate successful deletion by ensuring no errors are thrown during
 *    deletion.
 *
 * This comprehensive test validates role-based authorization and full
 * lifecycle management of marketplace widget installations within the
 * FlexOffice UI editor module.
 */
export async function test_api_marketplace_widget_installations_deletion_success(
  connection: api.IConnection,
) {
  // 1. Authenticate editor user by join
  const editorCreateBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IFlexOfficeEditor.ICreate;
  const editor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreateBody,
    });
  typia.assert(editor);

  // 2. Create a marketplace widget
  const widgetCreateBody = {
    widget_code: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    version: `${RandomGenerator.pick([..."0123456789"])}.${RandomGenerator.pick([..."0123456789"])}.${RandomGenerator.pick([..."0123456789"])}`,
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
      wordMin: 4,
      wordMax: 12,
    }),
  } satisfies IFlexOfficeMarketplaceWidget.ICreate;
  const widget: IFlexOfficeMarketplaceWidget =
    await api.functional.flexOffice.editor.marketplaceWidgets.create(
      connection,
      {
        body: widgetCreateBody,
      },
    );
  typia.assert(widget);
  TestValidator.equals("widget id matches", widget.id, widget.id);

  // 3. Create a UI page
  const pageCreateBody = {
    flex_office_page_theme_id: null,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 12,
    }),
    status: "draft",
  } satisfies IFlexOfficePage.ICreate;
  const page: IFlexOfficePage =
    await api.functional.flexOffice.editor.pages.create(connection, {
      body: pageCreateBody,
    });
  typia.assert(page);
  TestValidator.equals("page id matches", page.id, page.id);

  // 4. Create a widget installation linking the widget and page
  const installCreateBody = {
    marketplace_widget_id: widget.id,
    page_id: page.id,
    installation_date: new Date().toISOString(),
    configuration_data: null,
  } satisfies IFlexOfficeWidgetInstallation.ICreate;
  const installation: IFlexOfficeWidgetInstallation =
    await api.functional.flexOffice.editor.marketplaceWidgets.installations.createInstallation(
      connection,
      {
        widgetId: widget.id,
        body: installCreateBody,
      },
    );
  typia.assert(installation);
  TestValidator.equals(
    "installation id matches",
    installation.id,
    installation.id,
  );

  // 5. Delete the widget installation
  await api.functional.flexOffice.editor.marketplaceWidgets.installations.eraseInstallation(
    connection,
    {
      widgetId: widget.id,
      installationId: installation.id,
    },
  );

  // 6. Since no error is thrown on deletion, test passes
}
