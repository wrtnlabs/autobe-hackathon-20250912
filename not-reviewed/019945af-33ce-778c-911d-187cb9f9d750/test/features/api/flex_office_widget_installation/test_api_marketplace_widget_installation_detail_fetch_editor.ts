import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeMarketplaceWidget";
import type { IFlexOfficeWidgetInstallation } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidgetInstallation";

export async function test_api_marketplace_widget_installation_detail_fetch_editor(
  connection: api.IConnection,
) {
  // 1. Register editor user
  const editorCreateBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Pwd1234!",
  } satisfies IFlexOfficeEditor.ICreate;
  const editorAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreateBody,
    });
  typia.assert(editorAuthorized);

  // 2. Login editor user
  const editorLoginBody = {
    email: editorCreateBody.email,
    password: editorCreateBody.password,
  } satisfies IFlexOfficeEditor.ILogin;
  const editorLoginResult: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: editorLoginBody,
    });
  typia.assert(editorLoginResult);

  // 3. Create marketplace widget
  const widgetCreateBody = {
    widget_code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    version: "1.0.0",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IFlexOfficeMarketplaceWidget.ICreate;
  const widget: IFlexOfficeMarketplaceWidget =
    await api.functional.flexOffice.editor.marketplaceWidgets.create(
      connection,
      { body: widgetCreateBody },
    );
  typia.assert(widget);

  // 4. Create widget installation linked to page
  const pageId = typia.random<string & tags.Format<"uuid">>();
  const installationCreateBody = {
    marketplace_widget_id: widget.id,
    page_id: pageId,
    installation_date: new Date().toISOString(),
    configuration_data: JSON.stringify({ config: "value", enabled: true }),
  } satisfies IFlexOfficeWidgetInstallation.ICreate;
  const installation: IFlexOfficeWidgetInstallation =
    await api.functional.flexOffice.editor.marketplaceWidgets.installations.createInstallation(
      connection,
      { widgetId: widget.id, body: installationCreateBody },
    );
  typia.assert(installation);

  // 5. Fetch the installation detail
  const fetchedInstallation: IFlexOfficeWidgetInstallation =
    await api.functional.flexOffice.editor.marketplaceWidgets.installations.atWidgetInstallation(
      connection,
      { widgetId: widget.id, installationId: installation.id },
    );
  typia.assert(fetchedInstallation);

  // 6. Validate fetched data matches created installation
  TestValidator.equals(
    "installation id matches",
    fetchedInstallation.id,
    installation.id,
  );
  TestValidator.equals(
    "marketplace widget id matches",
    fetchedInstallation.marketplace_widget_id,
    widget.id,
  );
  TestValidator.equals(
    "page id matches",
    fetchedInstallation.page_id,
    installationCreateBody.page_id,
  );
  TestValidator.equals(
    "installation date matches",
    fetchedInstallation.installation_date,
    installationCreateBody.installation_date,
  );
  TestValidator.equals(
    "configuration data matches",
    fetchedInstallation.configuration_data ?? null,
    installationCreateBody.configuration_data,
  );
  TestValidator.equals(
    "created_at exists",
    typeof fetchedInstallation.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at exists",
    typeof fetchedInstallation.updated_at,
    "string",
  );

  // 7. Error tests for non-existent IDs
  await TestValidator.error(
    "fetch with unknown widgetId should fail",
    async () => {
      await api.functional.flexOffice.editor.marketplaceWidgets.installations.atWidgetInstallation(
        connection,
        {
          widgetId: typia.random<string & tags.Format<"uuid">>(),
          installationId: installation.id,
        },
      );
    },
  );

  await TestValidator.error(
    "fetch with unknown installationId should fail",
    async () => {
      await api.functional.flexOffice.editor.marketplaceWidgets.installations.atWidgetInstallation(
        connection,
        {
          widgetId: widget.id,
          installationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
