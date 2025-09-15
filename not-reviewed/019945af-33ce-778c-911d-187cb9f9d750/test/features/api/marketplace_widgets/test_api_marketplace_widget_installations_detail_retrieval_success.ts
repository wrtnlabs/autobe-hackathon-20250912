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
 * This test case covers the full scenario of an editor user successfully
 * retrieving detailed information about a specific marketplace widget
 * installation.
 *
 * Steps include:
 *
 * 1. Creating and authenticating an editor user to get editor-level access.
 * 2. Creating a marketplace widget to obtain a widgetId.
 * 3. Creating a UI page to obtain a pageId.
 * 4. Creating an installation linking the widget and page, retrieving
 *    installationId.
 * 5. Retrieving installation details by widgetId and installationId.
 * 6. Validating that the retrieved details correspond exactly to the
 *    installation creation.
 *
 * This scenario ensures proper authorization, data linkage, and accurate
 * retrieval functioning of the installations detail endpoint.
 */
export async function test_api_marketplace_widget_installations_detail_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate editor user
  const editorCreateBody = {
    name: RandomGenerator.name(),
    email: `${RandomGenerator.name(1).toLowerCase()}@example.com`,
    password: "securePassword123",
  } satisfies IFlexOfficeEditor.ICreate;
  const editor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreateBody,
    });
  typia.assert(editor);

  // 2. Create marketplace widget
  const widgetCreateBody = {
    widget_code: `widget-${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.name(3),
    version: `1.0.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0>>()}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IFlexOfficeMarketplaceWidget.ICreate;
  const widget: IFlexOfficeMarketplaceWidget =
    await api.functional.flexOffice.editor.marketplaceWidgets.create(
      connection,
      {
        body: widgetCreateBody,
      },
    );
  typia.assert(widget);

  // 3. Create UI page
  const pageCreateBody = {
    name: RandomGenerator.name(4),
    status: "draft",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    flex_office_page_theme_id: null,
  } satisfies IFlexOfficePage.ICreate;
  const page: IFlexOfficePage =
    await api.functional.flexOffice.editor.pages.create(connection, {
      body: pageCreateBody,
    });
  typia.assert(page);

  // 4. Create installation linking widget and page
  const installationCreateBody = {
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
        body: installationCreateBody,
      },
    );
  typia.assert(installation);

  // 5. Retrieve installation details
  const retrieved: IFlexOfficeWidgetInstallation =
    await api.functional.flexOffice.editor.marketplaceWidgets.installations.atWidgetInstallation(
      connection,
      {
        widgetId: widget.id,
        installationId: installation.id,
      },
    );
  typia.assert(retrieved);

  // 6. Validate that retrieved installation details match creation
  TestValidator.equals(
    "installation id matches",
    retrieved.id,
    installation.id,
  );
  TestValidator.equals(
    "marketplace_widget_id matches",
    retrieved.marketplace_widget_id,
    installation.marketplace_widget_id,
  );
  TestValidator.equals(
    "page id matches",
    retrieved.page_id,
    installation.page_id,
  );
  TestValidator.equals(
    "installation_date matches",
    retrieved.installation_date,
    installation.installation_date,
  );
  TestValidator.equals(
    "configuration_data matches",
    retrieved.configuration_data,
    installation.configuration_data,
  );
  TestValidator.predicate(
    "timestamps are valid ISO 8601",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$/.test(
      retrieved.created_at,
    ) &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$/.test(
        retrieved.updated_at,
      ),
  );
}
