import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageTheme";

/**
 * This test verifies that an editor can create UI page themes via
 * /flexOffice/editor/pageThemes. It ensures:
 *
 * - Editor registration and login returns valid tokens.
 * - Themes can be created with unique names and optional description.
 * - Duplicate names are rejected with conflict errors.
 * - Missing or empty required 'name' field triggers validation errors.
 *
 * Test steps:
 *
 * 1. Register and login an editor.
 * 2. Create a unique page theme; validate response structure.
 * 3. Attempt duplicate theme creation; expect conflict error.
 * 4. Try creating theme with empty name; expect validation error.
 */
export async function test_api_page_theme_creation_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Register new editor with unique email and password
  const editorCreateBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassword123!",
  } satisfies IFlexOfficeEditor.ICreate;
  const editorAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreateBody,
    });
  typia.assert(editorAuthorized);

  // 2. Login as the created editor
  const editorLoginBody = {
    email: editorCreateBody.email,
    password: editorCreateBody.password,
  } satisfies IFlexOfficeEditor.ILogin;
  const editorLoginAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: editorLoginBody,
    });
  typia.assert(editorLoginAuthorized);

  // 3. Create a unique page theme with name and optional description
  const themeCreateBody = {
    name: RandomGenerator.name(),
    description: `Description for theme - ${RandomGenerator.paragraph({ sentences: 3 })}`,
  } satisfies IFlexOfficePageTheme.ICreate;
  const createdTheme: IFlexOfficePageTheme =
    await api.functional.flexOffice.editor.pageThemes.create(connection, {
      body: themeCreateBody,
    });
  typia.assert(createdTheme);
  TestValidator.predicate(
    "Theme ID is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdTheme.id,
    ),
  );
  TestValidator.equals(
    "Theme name matches",
    createdTheme.name,
    themeCreateBody.name,
  );

  // 4. Attempt to create a duplicate theme name - expect conflict error (409)
  await TestValidator.error("Duplicate theme name should fail", async () => {
    await api.functional.flexOffice.editor.pageThemes.create(connection, {
      body: {
        name: themeCreateBody.name, // duplicate
        description: "Duplicate theme",
      } satisfies IFlexOfficePageTheme.ICreate,
    });
  });

  // 5. Attempt to create theme with empty name - expect validation error
  await TestValidator.error(
    "Empty required name field should fail",
    async () => {
      await api.functional.flexOffice.editor.pageThemes.create(connection, {
        body: {
          name: "",
          description: "No valid name",
        } satisfies IFlexOfficePageTheme.ICreate,
      });
    },
  );
}
