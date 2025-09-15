import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";

export async function test_api_editor_widget_script_deletion_with_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new editor user
  const editorCreateBody = {
    name: RandomGenerator.name(),
    email: `editor${Date.now()}_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "Password123!",
  } satisfies IFlexOfficeEditor.ICreate;

  const createdEditor = await api.functional.auth.editor.join(connection, {
    body: editorCreateBody,
  });
  typia.assert(createdEditor);

  // 2. Login as the editor
  const editorLoginBody = {
    email: editorCreateBody.email,
    password: editorCreateBody.password,
  } satisfies IFlexOfficeEditor.ILogin;

  const loggedInEditor = await api.functional.auth.editor.login(connection, {
    body: editorLoginBody,
  });
  typia.assert(loggedInEditor);

  // 3. Valid UUIDs for deletion
  const validWidgetId = typia.random<string & tags.Format<"uuid">>();
  const validScriptId = typia.random<string & tags.Format<"uuid">>();

  // 4. Delete widget script successfully with authentication
  await api.functional.flexOffice.editor.widgets.scripts.erase(connection, {
    widgetId: validWidgetId,
    scriptId: validScriptId,
  });

  // 5. Attempt deletion with invalid widgetId (expect 404)
  const invalidWidgetId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deletion with invalid widgetId results in 404",
    async () => {
      await api.functional.flexOffice.editor.widgets.scripts.erase(connection, {
        widgetId: invalidWidgetId,
        scriptId: validScriptId,
      });
    },
  );

  // 6. Attempt deletion with invalid scriptId (expect 404)
  const invalidScriptId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deletion with invalid scriptId results in 404",
    async () => {
      await api.functional.flexOffice.editor.widgets.scripts.erase(connection, {
        widgetId: validWidgetId,
        scriptId: invalidScriptId,
      });
    },
  );

  // 7. Unauthenticated deletion attempt (expect 401)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated deletion results in 401",
    async () => {
      await api.functional.flexOffice.editor.widgets.scripts.erase(
        unauthenticatedConnection,
        {
          widgetId: validWidgetId,
          scriptId: validScriptId,
        },
      );
    },
  );
}
