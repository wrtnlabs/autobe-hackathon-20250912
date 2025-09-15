import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageEditor";

/**
 * E2E test that:
 *
 * 1. Creates and authenticates an editor user.
 * 2. Creates a new UI page.
 * 3. Creates a page editor session associating the editor and page.
 * 4. Updates the page editor session.
 * 5. Validates the update took effect correctly.
 */
export async function test_api_editor_page_editor_session_update_successful(
  connection: api.IConnection,
) {
  // 1. Register and authenticate editor user
  const editorCreateBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "password1234",
  } satisfies IFlexOfficeEditor.ICreate;

  const editor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreateBody,
    });
  typia.assert(editor);

  // 2. Create a new UI page
  const pageCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 6 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    status: "draft",
    flex_office_page_theme_id: null,
  } satisfies IFlexOfficePage.ICreate;

  const page: IFlexOfficePage =
    await api.functional.flexOffice.editor.pages.create(connection, {
      body: pageCreateBody,
    });
  typia.assert(page);

  // 3. Create a page editor session associating the editor and page
  const pageEditorCreateBody = {
    page_id: page.id,
    editor_id: editor.id,
  } satisfies IFlexOfficePageEditor.ICreate;

  const pageEditor: IFlexOfficePageEditor =
    await api.functional.flexOffice.editor.pages.pageEditors.create(
      connection,
      {
        pageId: page.id,
        body: pageEditorCreateBody,
      },
    );
  typia.assert(pageEditor);

  // 4. Update the page editor session
  // Update deleted_at to null to mark active session, keeping page_id and editor_id the same
  const updateRequestBody = {
    page_id: pageEditor.page_id,
    editor_id: pageEditor.editor_id,
    deleted_at: null,
  } satisfies IFlexOfficePageEditor.IUpdate;

  const updatedPageEditor: IFlexOfficePageEditor =
    await api.functional.flexOffice.editor.pages.pageEditors.update(
      connection,
      {
        pageId: page.id,
        pageEditorId: pageEditor.id,
        body: updateRequestBody,
      },
    );

  typia.assert(updatedPageEditor);

  // 5. Validate updated data
  TestValidator.equals(
    "updated pageEditor id remains the same",
    updatedPageEditor.id,
    pageEditor.id,
  );
  TestValidator.equals(
    "page_id remains same",
    updatedPageEditor.page_id,
    pageEditor.page_id,
  );
  TestValidator.equals(
    "editor_id remains same",
    updatedPageEditor.editor_id,
    pageEditor.editor_id,
  );
  TestValidator.equals(
    "deleted_at was updated to null",
    updatedPageEditor.deleted_at,
    null,
  );
}
