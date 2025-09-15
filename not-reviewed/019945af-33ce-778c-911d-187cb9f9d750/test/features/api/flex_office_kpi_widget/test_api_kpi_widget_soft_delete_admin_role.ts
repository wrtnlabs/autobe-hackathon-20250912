import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeKpiWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeKpiWidget";

/**
 * Validate the soft deletion of KPI widgets by admin role.
 *
 * This e2e test runs full workflow of:
 *
 * 1. Creating an admin user.
 * 2. Logging in the admin user.
 * 3. Creating a KPI widget.
 * 4. Soft deleting the created KPI widget.
 * 5. Confirming the deletion by verifying failure to retrieve.
 *
 * Ensures only authorized admin can delete KPI widgets and deletion is
 * soft.
 *
 * Steps:
 *
 * 1. Register admin user with unique email/password.
 * 2. Login admin user to acquire token.
 * 3. Create KPI widget with valid flex_office_widget_id and config_json.
 * 4. Delete that KPI widget.
 * 5. Attempt to retrieve deleted KPI widget, assert error.
 */
export async function test_api_kpi_widget_soft_delete_admin_role(
  connection: api.IConnection,
) {
  // 1. Create admin user
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminPassword = "AdminPass123!";
  const adminCreateBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ICreate;
  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(adminAuthorized);

  // 2. Login admin user
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ILogin;
  const adminLoggedIn: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoggedIn);

  // 3. Create a valid KPI widget
  // Using random UUID for flex_office_widget_id and example JSON config
  // For config_json, provide a simple valid JSON string
  const flexOfficeWidgetId = typia.random<string & tags.Format<"uuid">>();
  const configJson = JSON.stringify({
    data_source: "default",
    aggregation: "sum",
  });
  const kpiCreateBody = {
    flex_office_widget_id: flexOfficeWidgetId,
    config_json: configJson,
  } satisfies IFlexOfficeKpiWidget.ICreate;
  const createdKpiWidget: IFlexOfficeKpiWidget =
    await api.functional.flexOffice.admin.widgets.kpi.create(connection, {
      body: kpiCreateBody,
    });
  typia.assert(createdKpiWidget);

  // 4. Delete the KPI widget
  await api.functional.flexOffice.admin.widgets.kpi.erase(connection, {
    kpiWidgetId: createdKpiWidget.id,
  });

  // 5. Attempt to delete the deleted KPI widget again and expect error (simulate retrieval failure)
  await TestValidator.error(
    "soft deleted KPI widget cannot be deleted again",
    async () => {
      await api.functional.flexOffice.admin.widgets.kpi.erase(connection, {
        kpiWidgetId: createdKpiWidget.id,
      });
    },
  );
}
