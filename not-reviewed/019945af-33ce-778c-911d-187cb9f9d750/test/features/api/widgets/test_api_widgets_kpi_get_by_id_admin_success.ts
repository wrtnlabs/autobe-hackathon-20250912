import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeKpiWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeKpiWidget";

/**
 * Test retrieving a specific KPI widget by ID as an admin user.
 *
 * This E2E test covers the complete workflow for authenticating an admin
 * user, creating a KPI widget, and verifying that the widget can be
 * retrieved by ID via the admin API.
 *
 * The test validates correct data retrieval, schema compliance, and access
 * restrictions to admin users.
 *
 * Steps:
 *
 * 1. Admin registration via /auth/admin/join with valid email and password.
 * 2. KPI widget creation via /flexOffice/admin/widgets/kpi with valid data.
 * 3. Retrieval of the KPI widget by its ID via GET
 *    /flexOffice/admin/widgets/kpi/{kpiWidgetId}.
 * 4. Validation of response data correctness and completeness.
 *
 * All API responses are asserted with typia.assert() for type safety and
 * TestValidator functions are used to verify key business logic.
 *
 * Authentication is handled automatically via connection header management.
 *
 * @param connection API connection with authentication context.
 */
export async function test_api_widgets_kpi_get_by_id_admin_success(
  connection: api.IConnection,
) {
  // 1. Admin joins with email and password for authentication
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
  } satisfies IFlexOfficeAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(adminAuth);

  // 2. Create a KPI widget with valid flex_office_widget_id and config_json
  const kpiCreateBody = {
    flex_office_widget_id: typia.random<string & tags.Format<"uuid">>(),
    config_json: JSON.stringify({
      metric: "sales",
      aggregation: "sum",
      display: "chart",
    }),
  } satisfies IFlexOfficeKpiWidget.ICreate;
  const createdKpi = await api.functional.flexOffice.admin.widgets.kpi.create(
    connection,
    { body: kpiCreateBody },
  );
  typia.assert(createdKpi);

  // 3. Retrieve KPI widget by the created ID
  const readKpi = await api.functional.flexOffice.admin.widgets.kpi.at(
    connection,
    { kpiWidgetId: createdKpi.id },
  );
  typia.assert(readKpi);

  // 4. Validate the retrieved KPI widget matches the created one
  TestValidator.equals("kpiWidget id should match", readKpi.id, createdKpi.id);
  TestValidator.equals(
    "flex_office_widget_id should match",
    readKpi.flex_office_widget_id,
    createdKpi.flex_office_widget_id,
  );
  TestValidator.equals(
    "config_json should match",
    readKpi.config_json,
    createdKpi.config_json,
  );

  // 5. Additional checks on timestamps and deleted_at
  TestValidator.predicate(
    "created_at is valid date string",
    typeof readKpi.created_at === "string" && readKpi.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date string",
    typeof readKpi.updated_at === "string" && readKpi.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at should be null or undefined",
    readKpi.deleted_at ?? null,
    null,
  );
}
