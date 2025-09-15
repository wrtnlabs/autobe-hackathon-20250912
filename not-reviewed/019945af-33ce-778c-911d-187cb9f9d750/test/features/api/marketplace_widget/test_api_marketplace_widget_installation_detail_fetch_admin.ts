import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeMarketplaceWidget";
import type { IFlexOfficeWidgetInstallation } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidgetInstallation";

/**
 * This scenario verifies the end-to-end retrieval of detailed information about
 * a specific widget installation linked to a marketplace widget. It tests:
 *
 * 1. Admin User Setup:
 *
 *    - Admin user registration and login.
 * 2. Marketplace Widget Creation:
 *
 *    - Admin creates a new marketplace widget.
 * 3. Widget Installation Creation:
 *
 *    - Admin creates an installation linking the marketplace widget to a page.
 * 4. Retrieve Installation Details:
 *
 *    - Admin fetches the detailed data of the specified widget installation by
 *         widgetId and installationId.
 *    - Validate response correctness including all detailed fields and timestamps.
 *
 * Authorization checks ensure that only admin users can retrieve detailed
 * installations. Failure cases include unauthorized access or non-existent
 * IDs.
 *
 * The scenario evaluates business logic for managing widget installations and
 * securing access to installation details in the FlexOffice extensibility
 * framework.
 */
export async function test_api_marketplace_widget_installation_detail_fetch_admin(
  connection: api.IConnection,
) {
  // 1. Admin User Registration
  const adminEmail = `${RandomGenerator.name(1)}@example.com`;
  const adminPassword = "P@ssw0rd123";

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ICreate;

  const adminJoin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminJoin);

  // 2. Admin User Login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ILogin;

  const adminLogin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLogin);

  // 3. Create Marketplace Widget
  const marketplaceWidgetCreateBody = {
    widget_code: `widget-${RandomGenerator.alphaNumeric(8)}`,
    name: `Widget ${RandomGenerator.name(2)}`,
    version: `1.0.${RandomGenerator.alphaNumeric(1)}`,
    description: null,
  } satisfies IFlexOfficeMarketplaceWidget.ICreate;

  const marketplaceWidget: IFlexOfficeMarketplaceWidget =
    await api.functional.flexOffice.admin.marketplaceWidgets.create(
      connection,
      { body: marketplaceWidgetCreateBody },
    );
  typia.assert(marketplaceWidget);

  // 4. Create Widget Installation
  const installationCreateBody = {
    marketplace_widget_id: marketplaceWidget.id,
    page_id: typia.random<string & tags.Format<"uuid">>(),
    installation_date: new Date().toISOString(),
    configuration_data: null,
  } satisfies IFlexOfficeWidgetInstallation.ICreate;

  const widgetInstallation: IFlexOfficeWidgetInstallation =
    await api.functional.flexOffice.editor.marketplaceWidgets.installations.createInstallation(
      connection,
      {
        widgetId: marketplaceWidget.id,
        body: installationCreateBody,
      },
    );
  typia.assert(widgetInstallation);

  // 5. Retrieve Installation Details
  const retrievedInstallation: IFlexOfficeWidgetInstallation =
    await api.functional.flexOffice.admin.marketplaceWidgets.installations.atWidgetInstallation(
      connection,
      {
        widgetId: marketplaceWidget.id,
        installationId: widgetInstallation.id,
      },
    );

  typia.assert(retrievedInstallation);

  // Validate IDs and references
  TestValidator.equals(
    "installation widgetId matches",
    retrievedInstallation.marketplace_widget_id,
    marketplaceWidget.id,
  );
  TestValidator.equals(
    "retrieved installation id equals created installation id",
    retrievedInstallation.id,
    widgetInstallation.id,
  );
  TestValidator.equals(
    "retrieved installation page_id equals created installation page_id",
    retrievedInstallation.page_id,
    installationCreateBody.page_id,
  );

  // Validate timestamps are strings in ISO format (simplified check)
  TestValidator.predicate(
    "installation_date is valid ISO string",
    typeof retrievedInstallation.installation_date === "string" &&
      !isNaN(Date.parse(retrievedInstallation.installation_date)),
  );
  TestValidator.predicate(
    "created_at is valid ISO string",
    typeof retrievedInstallation.created_at === "string" &&
      !isNaN(Date.parse(retrievedInstallation.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO string",
    typeof retrievedInstallation.updated_at === "string" &&
      !isNaN(Date.parse(retrievedInstallation.updated_at)),
  );

  // Validate optional deleted_at presence or null
  TestValidator.predicate(
    "deleted_at is null or valid ISO string",
    retrievedInstallation.deleted_at === null ||
      (typeof retrievedInstallation.deleted_at === "string" &&
        !isNaN(Date.parse(retrievedInstallation.deleted_at))),
  );
}
