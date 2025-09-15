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
 * Validates that an authenticated editor user can successfully create a widget
 * installation that associates a marketplace widget to a UI page.
 *
 * This test executes the entire flow starting from editor user
 * join/authentication, creating a marketplace widget, creating a FlexOffice UI
 * page, and then creating an installation linking the widget and page. It
 * validates that the installation record contains correct references and
 * timestamps.
 */
export async function test_api_marketplace_widget_installations_creation_success(
  connection: api.IConnection,
) {
  // 1. Authenticate editor user
  const editorEmail = typia.random<string & tags.Format<"email">>();
  const editorPassword = "1234";
  const editor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: {
        name: RandomGenerator.name(),
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ICreate,
    });
  typia.assert(editor);

  // 2. Create marketplace widget
  const widgetCreationBody = {
    widget_code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    version: "1.0.0",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IFlexOfficeMarketplaceWidget.ICreate;

  const widget: IFlexOfficeMarketplaceWidget =
    await api.functional.flexOffice.editor.marketplaceWidgets.create(
      connection,
      {
        body: widgetCreationBody,
      },
    );
  typia.assert(widget);

  // 3. Create UI page
  const pageCreationBody = {
    name: RandomGenerator.name(),
    status: "draft",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    flex_office_page_theme_id: null,
  } satisfies IFlexOfficePage.ICreate;

  const page: IFlexOfficePage =
    await api.functional.flexOffice.editor.pages.create(connection, {
      body: pageCreationBody,
    });
  typia.assert(page);

  // 4. Create widget installation
  const installationBody = {
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
        body: installationBody,
      },
    );
  typia.assert(installation);

  // 5. Validate installation associations
  TestValidator.equals(
    "installation marketplace_widget_id matches created widget",
    installation.marketplace_widget_id,
    widget.id,
  );

  TestValidator.equals(
    "installation page_id matches created page",
    installation.page_id,
    page.id,
  );

  TestValidator.predicate(
    "installation_date is valid ISO datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
      installation.installation_date,
    ),
  );

  TestValidator.equals(
    "configuration_data is null",
    installation.configuration_data,
    null,
  );
}
