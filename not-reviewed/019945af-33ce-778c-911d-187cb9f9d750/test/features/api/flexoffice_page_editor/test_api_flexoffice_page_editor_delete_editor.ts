import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageEditor";

export async function test_api_flexoffice_page_editor_delete_editor(
  connection: api.IConnection,
) {
  // 1. Register an editor user
  const editorCreate = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IFlexOfficeEditor.ICreate;

  const editor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, { body: editorCreate });
  typia.assert(editor);

  // 2. Login as the editor user
  const editorLogin = {
    email: editorCreate.email,
    password: editorCreate.password,
  } satisfies IFlexOfficeEditor.ILogin;

  const authorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, { body: editorLogin });
  typia.assert(authorized);

  // 3. Create a page editor session
  const pageEditorCreate = {
    page_id: typia.random<string & tags.Format<"uuid">>(),
    editor_id: editor.id,
  } satisfies IFlexOfficePageEditor.ICreate;

  const pageEditor: IFlexOfficePageEditor =
    await api.functional.flexOffice.editor.pageEditors.create(connection, {
      body: pageEditorCreate,
    });
  typia.assert(pageEditor);

  // 4. Delete the created page editor session
  await api.functional.flexOffice.editor.pageEditors.erase(connection, {
    pageEditorId: pageEditor.id,
  });

  // 5. Verify that deleting the same page editor session again fails
  await TestValidator.error(
    "deleted page editor session should not be found",
    async () => {
      await api.functional.flexOffice.editor.pageEditors.erase(connection, {
        pageEditorId: pageEditor.id,
      });
    },
  );

  // 6. Attempt to delete a page editor session without authentication
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "deletion without authentication should fail",
    async () => {
      await api.functional.flexOffice.editor.pageEditors.erase(
        unauthenticatedConnection,
        {
          pageEditorId: pageEditor.id,
        },
      );
    },
  );

  // 7. Verify that another authenticated editor cannot delete this session
  // Create another editor user
  const otherEditorCreate = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IFlexOfficeEditor.ICreate;
  const otherEditor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: otherEditorCreate,
    });
  typia.assert(otherEditor);

  // Login as other editor
  const otherEditorLogin = {
    email: otherEditorCreate.email,
    password: otherEditorCreate.password,
  } satisfies IFlexOfficeEditor.ILogin;
  const otherAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: otherEditorLogin,
    });
  typia.assert(otherAuthorized);

  // Attempt by other editor to delete the original page editor session
  await TestValidator.error(
    "unauthorized editor cannot delete others' page editor session",
    async () => {
      await api.functional.flexOffice.editor.pageEditors.erase(connection, {
        pageEditorId: pageEditor.id,
      });
    },
  );
}
