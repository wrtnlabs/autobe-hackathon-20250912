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
 * End-to-end test validating updating a widget installation.
 *
 * This test authenticates an editor user, creates a marketplace widget and UI
 * page, then creates an installation linking them. It updates the installation
 * with new data, asserts the updated content and timestamps, and confirms data
 * integrity.
 *
 * Steps:
 *
 * 1. Authenticate editor user
 * 2. Create marketplace widget
 * 3. Create UI page
 * 4. Create widget installation linking widget and page
 * 5. Update the installation with new values
 * 6. Assert updated content and timestamps
 */
export async function test_api_marketplace_widget_installations_update_success(
  connection: api.IConnection,
) {
  // 1. Authenticate editor user
  const editor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: {
        name: RandomGenerator.name(),
        email: RandomGenerator.alphaNumeric(8) + "@example.com",
        password: "samplePassword123",
      } satisfies IFlexOfficeEditor.ICreate,
    });
  typia.assert(editor);

  // 2. Create marketplace widget
  const widgetCreateBody = {
    widget_code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    version: "1.0.0",
    description: "Sample widget for testing",
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
    name: RandomGenerator.name(),
    status: "draft",
    description: "Sample page for widget installation",
  } satisfies IFlexOfficePage.ICreate;

  const page: IFlexOfficePage =
    await api.functional.flexOffice.editor.pages.create(connection, {
      body: pageCreateBody,
    });
  typia.assert(page);

  // 4. Create widget installation
  const nowISOString = new Date().toISOString();
  const installationCreateBody = {
    marketplace_widget_id: widget.id,
    page_id: page.id,
    installation_date: nowISOString,
    configuration_data: JSON.stringify({ key: "initialValue" }),
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

  // 5. Update the widget installation
  const updateBody = {
    page_id: page.id,
    marketplace_widget_id: widget.id,
    configuration_data: JSON.stringify({
      key: "updatedValue",
      featureFlag: true,
    }),
    installation_date: new Date(Date.now() + 3600000).toISOString(),
  } satisfies IFlexOfficeWidgetInstallation.IUpdate;

  const updatedInstallation: IFlexOfficeWidgetInstallation =
    await api.functional.flexOffice.editor.marketplaceWidgets.installations.updateInstallation(
      connection,
      {
        widgetId: widget.id,
        installationId: installation.id,
        body: updateBody,
      },
    );
  typia.assert(updatedInstallation);

  // 6. Assert updated values
  TestValidator.equals(
    "Updated installation configuration matches",
    updatedInstallation.configuration_data,
    updateBody.configuration_data,
  );

  TestValidator.equals(
    "Updated installation page_id matches",
    updatedInstallation.page_id,
    updateBody.page_id,
  );

  TestValidator.equals(
    "Updated installation marketplace_widget_id matches",
    updatedInstallation.marketplace_widget_id,
    updateBody.marketplace_widget_id,
  );

  TestValidator.predicate(
    "Updated installation_date is later or equal",
    new Date(updatedInstallation.installation_date).getTime() >=
      new Date(installation.installation_date).getTime(),
  );

  TestValidator.predicate(
    "Updated installation updated_at is later or equal",
    new Date(updatedInstallation.updated_at).getTime() >=
      new Date(installation.updated_at).getTime(),
  );
}
