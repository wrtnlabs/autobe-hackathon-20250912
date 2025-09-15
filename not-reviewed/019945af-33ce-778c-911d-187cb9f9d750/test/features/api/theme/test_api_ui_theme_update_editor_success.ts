import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficeTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTheme";

export async function test_api_ui_theme_update_editor_success(
  connection: api.IConnection,
) {
  // 1. Register an editor user and authenticate
  const editorEmail: string = typia.random<string & tags.Format<"email">>();
  const editor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: {
        name: RandomGenerator.name(),
        email: editorEmail,
        password: "test-password-123",
      } satisfies IFlexOfficeEditor.ICreate,
    });
  typia.assert(editor);

  // 2. Create a theme owned or accessible by the editor
  const themeNameOrig = RandomGenerator.paragraph({ sentences: 3 });
  const themeCssOrig = RandomGenerator.paragraph({ sentences: 5 });
  const createdTheme: IFlexOfficeTheme =
    await api.functional.flexOffice.editor.themes.createTheme(connection, {
      body: {
        name: themeNameOrig,
        css: themeCssOrig,
      } satisfies IFlexOfficeTheme.ICreate,
    });
  typia.assert(createdTheme);

  // 3. Update the theme's properties
  const themeNameUpdated = themeNameOrig + " Updated";
  const themeCssUpdated = themeCssOrig + " /* updated css */";
  const updatedTheme: IFlexOfficeTheme =
    await api.functional.flexOffice.editor.themes.updateTheme(connection, {
      id: createdTheme.id,
      body: {
        name: themeNameUpdated,
        css: themeCssUpdated,
      } satisfies IFlexOfficeTheme.IUpdate,
    });
  typia.assert(updatedTheme);

  // 4. Validate updated theme has correct ID and updated properties
  TestValidator.equals(
    "updated theme ID equals created theme ID",
    updatedTheme.id,
    createdTheme.id,
  );
  TestValidator.equals(
    "updated theme name matches",
    updatedTheme.name,
    themeNameUpdated,
  );
  TestValidator.equals(
    "updated theme css matches",
    updatedTheme.css,
    themeCssUpdated,
  );
  TestValidator.predicate(
    "updated theme updated_at is after created_at",
    new Date(updatedTheme.updated_at).getTime() >=
      new Date(updatedTheme.created_at).getTime(),
  );

  // 5. Attempt to update non-existent theme
  await TestValidator.error(
    "update non-existent theme should fail",
    async () => {
      await api.functional.flexOffice.editor.themes.updateTheme(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: {
          name: "Non-existent",
          css: "",
        } satisfies IFlexOfficeTheme.IUpdate,
      });
    },
  );

  // 6. Attempt to update theme without authentication (empty headers)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "update theme without auth should fail",
    async () => {
      await api.functional.flexOffice.editor.themes.updateTheme(
        unauthConnection,
        {
          id: createdTheme.id,
          body: {
            name: "Must fail",
            css: "",
          } satisfies IFlexOfficeTheme.IUpdate,
        },
      );
    },
  );
}
