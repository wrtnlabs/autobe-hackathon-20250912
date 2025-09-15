import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficeWidgetScript } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeWidgetScript";

/**
 * E2E Test for updating an existing custom script attached to a widget by
 * an editor user.
 *
 * This test performs the following flow:
 *
 * 1. Registers a new editor user via join API.
 * 2. Logs in as editor to obtain authentication.
 * 3. Assumes existing widgetId and scriptId and performs a script update.
 * 4. Validates that updates are successful and data is consistent.
 * 5. Repeats update with different data to affirm idempotence and correctness.
 * 6. Tests error handling for invalid update input such as empty script_type
 *    or content.
 *
 * All API calls use await and typia.assert for strict type validation.
 * Authentication tokens are managed automatically by the SDK.
 */
export async function test_api_custom_script_update(
  connection: api.IConnection,
) {
  // 1. Create editor user
  const joinBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
  } satisfies IFlexOfficeEditor.ICreate;

  const editor = await api.functional.auth.editor.join(connection, {
    body: joinBody,
  });
  typia.assert(editor);

  // 2. Login as editor
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IFlexOfficeEditor.ILogin;

  const login = await api.functional.auth.editor.login(connection, {
    body: loginBody,
  });
  typia.assert(login);

  // 3. Existing widget and script identifiers
  const widgetId = typia.random<string & tags.Format<"uuid">>();
  const scriptId = typia.random<string & tags.Format<"uuid">>();

  // 4. Prepare update payload
  const updateBody = {
    script_type: RandomGenerator.pick(["javascript", "python", "lua"] as const),
    script_content: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IFlexOfficeWidgetScript.IUpdate;

  // 5. Execute update
  const updatedScript =
    await api.functional.flexOffice.editor.widgets.scripts.update(connection, {
      widgetId,
      scriptId,
      body: updateBody,
    });
  typia.assert(updatedScript);

  TestValidator.predicate(
    "updatedScript has updated script_type",
    updatedScript.script_type === updateBody.script_type ||
      updateBody.script_type === undefined,
  );
  TestValidator.predicate(
    "updatedScript has updated script_content",
    updatedScript.script_content === updateBody.script_content ||
      updateBody.script_content === undefined,
  );

  // 6. Repeat update with different data
  const updateBody2 = {
    script_type: RandomGenerator.pick(["javascript", "python", "lua"] as const),
    script_content: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 12,
    }),
  } satisfies IFlexOfficeWidgetScript.IUpdate;

  const updatedScript2 =
    await api.functional.flexOffice.editor.widgets.scripts.update(connection, {
      widgetId,
      scriptId,
      body: updateBody2,
    });
  typia.assert(updatedScript2);

  TestValidator.predicate(
    "updatedScript2 has updated script_type",
    updatedScript2.script_type === updateBody2.script_type ||
      updateBody2.script_type === undefined,
  );
  TestValidator.predicate(
    "updatedScript2 has updated script_content",
    updatedScript2.script_content === updateBody2.script_content ||
      updateBody2.script_content === undefined,
  );

  // 7. Error tests for invalid updates
  await TestValidator.error(
    "Update with empty script_type should fail",
    async () => {
      await api.functional.flexOffice.editor.widgets.scripts.update(
        connection,
        {
          widgetId,
          scriptId,
          body: { script_type: "" },
        },
      );
    },
  );

  await TestValidator.error(
    "Update with empty script_content should fail",
    async () => {
      await api.functional.flexOffice.editor.widgets.scripts.update(
        connection,
        {
          widgetId,
          scriptId,
          body: { script_content: "" },
        },
      );
    },
  );
}
