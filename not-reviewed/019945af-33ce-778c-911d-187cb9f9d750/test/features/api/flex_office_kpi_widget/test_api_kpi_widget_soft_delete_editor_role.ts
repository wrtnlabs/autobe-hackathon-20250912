import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficeKpiWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeKpiWidget";

export async function test_api_kpi_widget_soft_delete_editor_role(
  connection: api.IConnection,
) {
  // 1. Join editor user with required fields
  const editorCreateBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IFlexOfficeEditor.ICreate;

  const editorAuth: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreateBody,
    });
  typia.assert(editorAuth);

  // Confirm editor auth token exists
  TestValidator.predicate(
    "editor join returns access token",
    typeof editorAuth.token.access === "string" &&
      editorAuth.token.access.length > 0,
  );

  // 2. Login editor user with correct credentials
  const editorLoginBody = {
    email: editorCreateBody.email,
    password: editorCreateBody.password,
  } satisfies IFlexOfficeEditor.ILogin;

  const editorLogin: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: editorLoginBody,
    });
  typia.assert(editorLogin);

  // Confirm editor login token exists
  TestValidator.predicate(
    "editor login returns access token",
    typeof editorLogin.token.access === "string" &&
      editorLogin.token.access.length > 0,
  );

  // Confirm join and login user IDs match
  TestValidator.equals(
    "editor user ID consistency",
    editorLogin.id,
    editorAuth.id,
  );

  // 3. Create KPI Widget
  const kpiWidgetCreateBody = {
    flex_office_widget_id: typia.random<string & tags.Format<"uuid">>(),
    config_json: JSON.stringify({
      query: "SELECT COUNT(*) FROM sales",
      aggregation: "sum",
      display: {
        type: "number",
        label: "Total Sales",
      },
    }),
  } satisfies IFlexOfficeKpiWidget.ICreate;

  const kpiWidget: IFlexOfficeKpiWidget =
    await api.functional.flexOffice.editor.widgets.kpi.create(connection, {
      body: kpiWidgetCreateBody,
    });
  typia.assert(kpiWidget);

  // 4. Soft delete the KPI widget
  await api.functional.flexOffice.editor.widgets.kpi.erase(connection, {
    kpiWidgetId: kpiWidget.id,
  });

  // 5. Verify that deleting the same KPI widget again results in an error
  await TestValidator.error(
    "delete already deleted KPI widget fails",
    async () => {
      await api.functional.flexOffice.editor.widgets.kpi.erase(connection, {
        kpiWidgetId: kpiWidget.id,
      });
    },
  );
}
