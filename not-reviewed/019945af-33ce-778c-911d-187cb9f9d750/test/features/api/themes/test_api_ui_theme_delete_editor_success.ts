import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficeTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTheme";

export async function test_api_ui_theme_delete_editor_success(
  connection: api.IConnection,
) {
  // 1. Editor user registration and login
  const editorInput = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
  } satisfies IFlexOfficeEditor.ICreate;
  const editor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorInput,
    });
  typia.assert(editor);

  // 2. Create a theme resource
  const themeInput = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    css: null,
  } satisfies IFlexOfficeTheme.ICreate;
  const theme: IFlexOfficeTheme =
    await api.functional.flexOffice.editor.themes.createTheme(connection, {
      body: themeInput,
    });
  typia.assert(theme);

  // 3. Delete the theme successfully
  await api.functional.flexOffice.editor.themes.eraseTheme(connection, {
    id: theme.id,
  });

  // 4. Attempt to delete a non-existent theme and expect error
  await TestValidator.error(
    "should fail deleting non-existent theme",
    async () => {
      await api.functional.flexOffice.editor.themes.eraseTheme(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 5. Attempt to delete a theme without authorization
  // Create unauthenticated connection by cloning and removing headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated delete should fail", async () => {
    await api.functional.flexOffice.editor.themes.eraseTheme(unauthConn, {
      id: theme.id,
    });
  });
}
