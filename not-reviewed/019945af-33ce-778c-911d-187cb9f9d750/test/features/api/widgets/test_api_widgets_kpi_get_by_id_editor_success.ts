import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficeKpiWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeKpiWidget";

/**
 * Scenario Overview: This test validates the successful retrieval of a KPI
 * widget by its ID when accessed by an editor user. The test covers the full
 * flow starting from the registration of an editor user, logging in as that
 * editor, creating a KPI widget through an admin endpoint to get a valid KPI
 * widget ID, and finally retrieving the KPI widget using the editor API. It
 * ensures that authorization and data integrity are properly enforced. The main
 * steps include:
 *
 * 1. Editor user registration via /auth/editor/join.
 * 2. Editor user login via /auth/editor/login.
 * 3. Admin user registration and login for authorization to create a KPI widget.
 * 4. KPI widget creation via /flexOffice/admin/widgets/kpi.
 * 5. Retrieving the created KPI widget by ID as the logged-in editor user.
 * 6. Validating that the retrieved KPI widget matches the created widget's data.
 *
 * The test confirms the correct operation of role-based access control and data
 * retrieval consistency for editor users on the KPI widget resource.
 *
 * Dependencies are respected: editor and admin users are created and
 * authenticated before creation and retrieval of the KPI widget.
 *
 * All required fields and proper token headers are used. typia.assert is called
 * for thorough type validation on API responses. TestValidator checks ensure
 * that the retrieved KPI widget's ID and main fields match the created one,
 * confirming successful fetch and correct authorization handling.
 *
 * No negative error or type error tests are included as per requirements.
 *
 * Business Context: The KPI widget is a part of a dashboard in the FlexOffice
 * system for business analytics. Editors are authorized users that can view KPI
 * widgets. The test verifies data integrity and secure role-based access.
 */
export async function test_api_widgets_kpi_get_by_id_editor_success(
  connection: api.IConnection,
) {
  // 1. Register an editor user
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

  // 2. Login as the editor user
  const editorLoginBody = {
    email: editorCreateBody.email,
    password: editorCreateBody.password,
  } satisfies IFlexOfficeEditor.ILogin;

  const editorLoggedIn: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: editorLoginBody,
    });
  typia.assert(editorLoggedIn);

  // 3. Register an admin user
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IFlexOfficeAdmin.ICreate;

  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 4. Login as the admin user
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IFlexOfficeAdmin.ILogin;

  const adminLoggedIn: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 5. Create a KPI widget using admin privileges
  const kpiCreateBody = {
    flex_office_widget_id: typia.random<string & tags.Format<"uuid">>(),
    config_json: JSON.stringify({
      dataSource: "ExampleDataSource",
      aggregation: "sum",
      displayOptions: { color: "blue", format: "currency" },
    }),
  } satisfies IFlexOfficeKpiWidget.ICreate;

  const kpiWidget: IFlexOfficeKpiWidget =
    await api.functional.flexOffice.admin.widgets.kpi.create(connection, {
      body: kpiCreateBody,
    });
  typia.assert(kpiWidget);

  // 6. Switch back to editor authentication
  await api.functional.auth.editor.login(connection, {
    body: editorLoginBody,
  });

  // 7. Retrieve the KPI widget by ID as the editor
  const retrievedWidget: IFlexOfficeKpiWidget =
    await api.functional.flexOffice.editor.widgets.kpi.at(connection, {
      kpiWidgetId: kpiWidget.id,
    });
  typia.assert(retrievedWidget);

  // 8. Validate the retrieved KPI widget matches the created widget
  TestValidator.equals(
    "KPI widget ID matches",
    retrievedWidget.id,
    kpiWidget.id,
  );
  TestValidator.equals(
    "KPI widget flex_office_widget_id matches",
    retrievedWidget.flex_office_widget_id,
    kpiWidget.flex_office_widget_id,
  );
  TestValidator.equals(
    "KPI widget config_json matches",
    retrievedWidget.config_json,
    kpiWidget.config_json,
  );
  TestValidator.equals(
    "KPI widget created_at matches",
    retrievedWidget.created_at,
    kpiWidget.created_at,
  );
  TestValidator.equals(
    "KPI widget updated_at matches",
    retrievedWidget.updated_at,
    kpiWidget.updated_at,
  );
  TestValidator.equals(
    "KPI widget deleted_at matches",
    retrievedWidget.deleted_at ?? null,
    kpiWidget.deleted_at ?? null,
  );
}
