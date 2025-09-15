import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageEditor";

/**
 * Test verifying retrieval of an active page editor session by an
 * authenticated editor.
 *
 * Workflow:
 *
 * 1. Register a new editor user with /auth/editor/join.
 * 2. Log in as the editor with /auth/editor/login.
 * 3. Create a UI page with /flexOffice/editor/pages.
 * 4. Create a page editor session with /flexOffice/editor/pageEditors.
 * 5. Retrieve the created page editor session with GET
 *    /flexOffice/editor/pages/{pageId}/pageEditors/{pageEditorId}.
 *
 * Validations ensure the retrieved session matches the created session,
 * including matching IDs and UUIDs, and verifying timestamp formats.
 *
 * The test validates authentication context management and correct
 * authorization enforcement.
 */
export async function test_api_page_editor_session_retrieve_editor_authentication_success(
  connection: api.IConnection,
) {
  // 1. Register a new editor user
  const editorName = RandomGenerator.name();
  const editorEmail = `${RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase()}${typia.random<string & tags.Format<"uuid">>().slice(0, 8)}@example.com`;
  const editorPassword = "Password123!";

  const editor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: {
        name: editorName,
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ICreate,
    });
  typia.assert(editor);

  // 2. Log in as the editor
  const loggedInEditor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: {
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ILogin,
    });
  typia.assert(loggedInEditor);

  // 3. Create a UI page
  const pageCreateBody = {
    name: `page-${RandomGenerator.alphaNumeric(6)}`,
    status: "draft",
    description: null,
    flex_office_page_theme_id: null,
  } satisfies IFlexOfficePage.ICreate;

  const page: IFlexOfficePage =
    await api.functional.flexOffice.editor.pages.create(connection, {
      body: pageCreateBody,
    });
  typia.assert(page);

  // 4. Create a page editor session linking editor and page
  const pageEditorCreateBody = {
    page_id: page.id,
    editor_id: editor.id,
  } satisfies IFlexOfficePageEditor.ICreate;

  const pageEditor: IFlexOfficePageEditor =
    await api.functional.flexOffice.editor.pageEditors.create(connection, {
      body: pageEditorCreateBody,
    });
  typia.assert(pageEditor);

  // 5. Retrieve the page editor session
  const retrievedSession: IFlexOfficePageEditor =
    await api.functional.flexOffice.editor.pages.pageEditors.at(connection, {
      pageId: page.id,
      pageEditorId: pageEditor.id,
    });
  typia.assert(retrievedSession);

  // Validations
  TestValidator.equals(
    "pageEditor id matches",
    retrievedSession.id,
    pageEditor.id,
  );
  TestValidator.equals(
    "pageEditor page_id matches",
    retrievedSession.page_id,
    page.id,
  );
  TestValidator.equals(
    "pageEditor editor_id matches",
    retrievedSession.editor_id,
    editor.id,
  );

  TestValidator.predicate(
    "pageEditor created_at is valid ISO 8601",
    !isNaN(Date.parse(retrievedSession.created_at)),
  );
  TestValidator.predicate(
    "pageEditor updated_at is valid ISO 8601",
    !isNaN(Date.parse(retrievedSession.updated_at)),
  );
  // No validation for deleted_at as it may be null
}
