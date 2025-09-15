import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficeWidgetScript } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidgetScript";

/**
 * This test validates the creation of a custom script for a FlexOffice UI
 * widget. It covers the full workflow starting from editor user registration,
 * authentication, script creation with valid data, and negative scenarios to
 * verify validation errors on incorrect inputs.
 *
 * Steps:
 *
 * 1. Register an editor user with random realistic data.
 * 2. Authenticate the editor user using login endpoint.
 * 3. Use a valid widgetId and create a script attached to that widget.
 * 4. Verify the created script's returned data matches the input.
 * 5. Test error cases for invalid script_type and empty script_content.
 */
export async function test_api_custom_script_creation(
  connection: api.IConnection,
) {
  // 1. Editor joins (register)
  const editorEmail = typia.random<string & tags.Format<"email">>();
  const editorName = RandomGenerator.name();
  const editorPassword = "SecureP@ssw0rd123";

  const editorAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: {
        email: editorEmail,
        name: editorName,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ICreate,
    });
  typia.assert(editorAuthorized);

  // 2. Editor logs in
  const editorLogin: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: {
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ILogin,
    });
  typia.assert(editorLogin);

  // Use the authenticated session from login

  // 3. Assume a widgetId (valid UUID)
  const widgetId = typia.random<string & tags.Format<"uuid">>();

  // 4. Create a valid custom script
  const validScriptType = "javascript";
  const validScriptContent = "console.log('Hello World');";

  const createScriptBody = {
    flex_office_widget_id: widgetId,
    script_type: validScriptType,
    script_content: validScriptContent,
  } satisfies IFlexOfficeWidgetScript.ICreate;

  const createdScript: IFlexOfficeWidgetScript =
    await api.functional.flexOffice.editor.widgets.scripts.create(connection, {
      widgetId: widgetId,
      body: createScriptBody,
    });
  typia.assert(createdScript);
  TestValidator.equals(
    "widgetId of created script matches",
    createdScript.flex_office_widget_id,
    widgetId,
  );
  TestValidator.equals(
    "script_type of created script matches",
    createdScript.script_type,
    validScriptType,
  );
  TestValidator.equals(
    "script_content of created script matches",
    createdScript.script_content,
    validScriptContent,
  );

  // 5. Negative test case: invalid script_type
  const invalidScriptType = "invalid_script_type";
  const invalidScriptBody1 = {
    flex_office_widget_id: widgetId,
    script_type: invalidScriptType,
    script_content: validScriptContent,
  } satisfies IFlexOfficeWidgetScript.ICreate;

  await TestValidator.error(
    "create script fails with invalid script_type",
    async () => {
      await api.functional.flexOffice.editor.widgets.scripts.create(
        connection,
        {
          widgetId: widgetId,
          body: invalidScriptBody1,
        },
      );
    },
  );

  // 6. Negative test case: missing script_content
  const missingContentScriptBody = {
    flex_office_widget_id: widgetId,
    script_type: validScriptType,
    script_content: "",
  } satisfies IFlexOfficeWidgetScript.ICreate;

  await TestValidator.error(
    "create script fails with empty script_content",
    async () => {
      await api.functional.flexOffice.editor.widgets.scripts.create(
        connection,
        {
          widgetId: widgetId,
          body: missingContentScriptBody,
        },
      );
    },
  );
}
