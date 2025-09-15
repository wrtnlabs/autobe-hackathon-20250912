import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeMarketplaceWidget";

/**
 * An end-to-end test validating the complete admin workflow from registration
 * through marketplace widget creation and deletion.
 *
 * This test registers a new admin user with unique credentials, logs them in to
 * acquire authentication tokens, creates a new marketplace widget with unique
 * identifiers, then deletes the widget by its UUID. It confirms that deletion
 * behaves correctly and that attempting to delete a non-existent widget errors
 * appropriately.
 *
 * The test exercises critical business logic enforcing unique widget codes,
 * authorization, and idempotent deletion handling.
 *
 * Steps:
 *
 * 1. Register an admin user with random valid email and password.
 * 2. Login with the same credentials.
 * 3. Create a marketplace widget with unique widget code, name, version, and null
 *    description.
 * 4. Delete the created marketplace widget by its UUID.
 * 5. Verify that deleting the same widget again results in an error.
 */
export async function test_api_marketplace_widget_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin Registration
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminCreateBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ICreate;
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Admin Login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ILogin;
  const adminLogged: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogged);

  // 3. Marketplace Widget Creation
  const widgetCode = `widget_${RandomGenerator.alphaNumeric(6)}`;
  const widgetCreateBody = {
    widget_code: widgetCode,
    name: RandomGenerator.name(),
    version: `${RandomGenerator.alphabets(1)}.${RandomGenerator.alphaNumeric(1)}`,
    description: null,
  } satisfies IFlexOfficeMarketplaceWidget.ICreate;
  const widget: IFlexOfficeMarketplaceWidget =
    await api.functional.flexOffice.admin.marketplaceWidgets.create(
      connection,
      {
        body: widgetCreateBody,
      },
    );
  typia.assert(widget);

  TestValidator.equals(
    "widget creation widget_code matches",
    widget.widget_code,
    widgetCode,
  );

  // 4. Marketplace Widget Deletion
  await api.functional.flexOffice.admin.marketplaceWidgets.eraseMarketplaceWidget(
    connection,
    { id: widget.id },
  );

  // Attempt to delete again should raise error (async error check)
  await TestValidator.error("deleting non-existent widget throws", async () => {
    await api.functional.flexOffice.admin.marketplaceWidgets.eraseMarketplaceWidget(
      connection,
      { id: widget.id },
    );
  });
}
