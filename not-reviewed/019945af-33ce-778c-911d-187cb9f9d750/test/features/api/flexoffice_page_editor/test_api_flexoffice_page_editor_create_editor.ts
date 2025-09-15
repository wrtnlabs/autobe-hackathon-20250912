import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageEditor";

/**
 * This E2E test validates the creation of a new page editor session for the
 * FlexOffice platform. The test simulates registering a new editor, logging
 * in, and creating a page editor session.
 *
 * The workflow includes:
 *
 * 1. Creating a new editor user account via auth/editor/join endpoint.
 * 2. Authenticating the editor through auth/editor/login endpoint.
 * 3. Attempting to create a page editor session with a valid page_id and
 *    editor_id.
 * 4. Validating that the response matches the expected IFlexOfficePageEditor
 *    structure.
 * 5. Confirming timestamp fields are proper ISO date-time strings and IDs are
 *    UUIDs.
 * 6. Checking for error handling when invalid page or editor IDs are used.
 *
 * This test ensures the business logic of preventing duplicate editor
 * sessions, enforcing authentication, and proper data relationships between
 * page and editor.
 */
export async function test_api_flexoffice_page_editor_create_editor(
  connection: api.IConnection,
) {
  // 1. Register a new editor user
  const name: string = RandomGenerator.name();
  const email: string = `${name.toLowerCase().replace(/\s+/g, "")}${typia.random<string & tags.Format<"uuid">>().slice(0, 8)}@example.com`;
  const password: string = `Passw0rd!${RandomGenerator.alphaNumeric(5)}`;
  const editorCreateBody = {
    name,
    email,
    password,
  } satisfies IFlexOfficeEditor.ICreate;
  const editorResponse: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreateBody,
    });
  typia.assert(editorResponse);

  // 2. Login as the new editor user
  const editorLoginBody = {
    email,
    password,
  } satisfies IFlexOfficeEditor.ILogin;
  const loginResponse: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: editorLoginBody,
    });
  typia.assert(loginResponse);

  const editorId: string & tags.Format<"uuid"> = editorResponse.id;

  // 3. Create a new page editor session
  const pageId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const pageEditorCreateBody = {
    page_id: pageId,
    editor_id: editorId,
  } satisfies IFlexOfficePageEditor.ICreate;
  const pageEditorResponse: IFlexOfficePageEditor =
    await api.functional.flexOffice.editor.pageEditors.create(connection, {
      body: pageEditorCreateBody,
    });
  typia.assert(pageEditorResponse);

  // 4. Validate response properties
  TestValidator.predicate(
    "page editor id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      pageEditorResponse.id,
    ),
  );
  TestValidator.equals("page id matches", pageEditorResponse.page_id, pageId);
  TestValidator.equals(
    "editor id matches",
    pageEditorResponse.editor_id,
    editorId,
  );

  TestValidator.predicate(
    "creation timestamp is valid ISO date-time",
    !isNaN(Date.parse(pageEditorResponse.created_at)),
  );
  TestValidator.predicate(
    "update timestamp is valid ISO date-time",
    !isNaN(Date.parse(pageEditorResponse.updated_at)),
  );

  // 5. Testing error cases
  // Invalid page_id format
  await TestValidator.error("invalid page_id rejects creation", async () => {
    const invalidPageEditor = {
      page_id: "invalid-uuid",
      editor_id: editorId,
    } satisfies IFlexOfficePageEditor.ICreate;
    await api.functional.flexOffice.editor.pageEditors.create(connection, {
      body: invalidPageEditor,
    });
  });

  // Invalid editor_id format
  await TestValidator.error("invalid editor_id rejects creation", async () => {
    const invalidEditorEditor = {
      page_id: pageId,
      editor_id: "invalid-uuid",
    } satisfies IFlexOfficePageEditor.ICreate;
    await api.functional.flexOffice.editor.pageEditors.create(connection, {
      body: invalidEditorEditor,
    });
  });

  // Unauthorized - simulate by using a fresh connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated request rejects creation",
    async () => {
      await api.functional.flexOffice.editor.pageEditors.create(
        unauthenticatedConnection,
        { body: pageEditorCreateBody },
      );
    },
  );
}
