import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficeTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTheme";

/**
 * Test the complete user workflow from editor creation, login, to authorized UI
 * theme detail retrieval.
 *
 * This test ensures that only authenticated editor users can access theme
 * details, validating creation/login tokens and theme data integrity.
 * Unauthorized access attempts and retrieval of non-existent themes are also
 * tested to confirm proper error handling.
 *
 * Test Steps:
 *
 * 1. Create a new editor user with realistic credentials.
 * 2. Login with the created editor user's credentials.
 * 3. Retrieve a UI theme detail using the authenticated connection.
 * 4. Verify the theme's UUID, name presence, and timestamp formats.
 * 5. Attempt unauthorized access (empty headers) and expect failure.
 * 6. Attempt retrieval of a non-existent theme and expect failure.
 */
export async function test_api_ui_theme_retrieval_with_editor_authentication(
  connection: api.IConnection,
) {
  // 1. Editor user registration
  const editorCreationBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassword123!",
  } satisfies IFlexOfficeEditor.ICreate;

  const editorAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreationBody,
    });
  typia.assert(editorAuthorized);

  // 2. Editor user login
  const editorLoginBody = {
    email: editorCreationBody.email,
    password: editorCreationBody.password,
  } satisfies IFlexOfficeEditor.ILogin;

  const editorLoginAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: editorLoginBody,
    });
  typia.assert(editorLoginAuthorized);

  // 3. Retrieve UI theme details
  const themeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const theme: IFlexOfficeTheme =
    await api.functional.flexOffice.editor.themes.atTheme(connection, {
      id: themeId,
    });
  typia.assert(theme);

  TestValidator.predicate(
    "Theme ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      theme.id,
    ),
  );
  TestValidator.predicate(
    "Theme has a name",
    typeof theme.name === "string" && theme.name.length > 0,
  );
  TestValidator.predicate(
    "Theme created_at is ISO date-time string",
    new Date(theme.created_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "Theme updated_at is ISO date-time string",
    new Date(theme.updated_at).toString() !== "Invalid Date",
  );

  // Testing unauthorized errors
  // Create an unauthenticated connection with empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "Unauthorized access without token fails",
    async () => {
      await api.functional.flexOffice.editor.themes.atTheme(unauthConn, {
        id: themeId,
      });
    },
  );

  // Test retrieval of non-existent theme id
  const nonExistentThemeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "Retrieval of non-existent theme ID fails",
    async () => {
      await api.functional.flexOffice.editor.themes.atTheme(connection, {
        id: nonExistentThemeId,
      });
    },
  );
}
