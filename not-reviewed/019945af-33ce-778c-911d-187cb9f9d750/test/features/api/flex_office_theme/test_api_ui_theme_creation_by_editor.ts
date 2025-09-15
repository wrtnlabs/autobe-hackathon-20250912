import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficeTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTheme";

export async function test_api_ui_theme_creation_by_editor(
  connection: api.IConnection,
) {
  // 1. Register a new editor user - unique name, email, password
  const editorCreateBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
  } satisfies IFlexOfficeEditor.ICreate;

  const joinedEditor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreateBody,
    });
  typia.assert(joinedEditor);

  // 2. Login with the registered editor account
  const editorLoginBody = {
    email: editorCreateBody.email,
    password: editorCreateBody.password,
  } satisfies IFlexOfficeEditor.ILogin;

  const loggedInEditor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: editorLoginBody,
    });
  typia.assert(loggedInEditor);

  // 3. Create a new theme with a unique name and optional CSS
  const themeCreateBody = {
    name: `TestTheme_${RandomGenerator.alphaNumeric(8)}`,
    css: `body { background-color: #${RandomGenerator.alphaNumeric(6)}; }`,
  } satisfies IFlexOfficeTheme.ICreate;

  const createdTheme: IFlexOfficeTheme =
    await api.functional.flexOffice.editor.themes.createTheme(connection, {
      body: themeCreateBody,
    });
  typia.assert(createdTheme);

  // Validate the returned theme content
  TestValidator.predicate(
    "theme id is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdTheme.id,
    ),
  );
  TestValidator.equals(
    "theme name matches input",
    createdTheme.name,
    themeCreateBody.name,
  );
  TestValidator.predicate(
    "created_at exists and is string",
    typeof createdTheme.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at exists and is string",
    typeof createdTheme.updated_at === "string",
  );
}
