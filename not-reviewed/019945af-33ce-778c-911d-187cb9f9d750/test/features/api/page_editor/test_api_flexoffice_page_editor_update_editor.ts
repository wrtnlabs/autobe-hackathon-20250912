import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageEditor";

/**
 * Test updating an active editor session on a UI page in FlexOffice.
 *
 * This function performs a full workflow test to validate that an editor
 * user can update their own page editor session correctly.
 *
 * Steps:
 *
 * 1. Register a new editor user.
 * 2. Authenticate as the editor to obtain authorization tokens.
 * 3. Create a new active page editor session referencing the editor and a
 *    page.
 * 4. Generate update data modifying page_id or editor_id fields.
 * 5. Attempt to update the page editor session via PUT.
 * 6. Assert the update response matches the expected update values.
 *
 * This test ensures that authorization, input validation, and business
 * rules around page editor session updates are enforced.
 */
export async function test_api_flexoffice_page_editor_update_editor(
  connection: api.IConnection,
) {
  // 1. Register a new editor user
  const editorEmail = typia.random<string & tags.Format<"email">>();
  const editorPassword = RandomGenerator.alphaNumeric(10);
  const editor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: {
        name: RandomGenerator.name(),
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ICreate,
    });
  typia.assert(editor);

  // 2. Authenticate as the editor user to obtain tokens
  const login: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: {
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ILogin,
    });
  typia.assert(login);

  // 3. Create an active page editor session for this editor
  const pageId = typia.random<string & tags.Format<"uuid">>();
  const pageEditor: IFlexOfficePageEditor =
    await api.functional.flexOffice.editor.pageEditors.create(connection, {
      body: {
        page_id: pageId,
        editor_id: editor.id,
      } satisfies IFlexOfficePageEditor.ICreate,
    });
  typia.assert(pageEditor);
  TestValidator.equals(
    "page editor id matches on creation",
    pageEditor.editor_id,
    editor.id,
  );

  // 4. Prepare update data for page editor session
  const updatedPageId = typia.random<string & tags.Format<"uuid">>();
  const updatedEditorId = editor.id; // Still same editor, only update page_id
  const updateBody = {
    page_id: updatedPageId,
    editor_id: updatedEditorId,
    deleted_at: null,
  } satisfies IFlexOfficePageEditor.IUpdate;

  // 5. Perform PUT to update the page editor session
  const updatedSession: IFlexOfficePageEditor =
    await api.functional.flexOffice.editor.pageEditors.update(connection, {
      pageEditorId: pageEditor.id,
      body: updateBody,
    });
  typia.assert(updatedSession);

  // 6. Validate the updated session properties
  TestValidator.equals(
    "page_editor id remains same after update",
    updatedSession.id,
    pageEditor.id,
  );
  TestValidator.equals(
    "page_id updated correctly",
    updatedSession.page_id,
    updateBody.page_id,
  );
  TestValidator.equals(
    "editor_id remains correct",
    updatedSession.editor_id,
    updateBody.editor_id,
  );
  TestValidator.equals(
    "deleted_at set to null to mark as active",
    updatedSession.deleted_at,
    null,
  );

  // 7. Validate timestamps updated_at is updated (different) and created_at remains same
  TestValidator.predicate(
    "updated_at changed after update",
    updatedSession.updated_at !== pageEditor.updated_at,
  );
  TestValidator.equals(
    "created_at remains same after update",
    updatedSession.created_at,
    pageEditor.created_at,
  );
}
