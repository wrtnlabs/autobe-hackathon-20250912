import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageEditor";

/**
 * This test scenario validates the retrieval of a specific page editor session
 * by its unique ID by an authorized editor user in the FlexOffice system.
 *
 * Workflow:
 *
 * 1. Register a new editor user via /auth/editor/join with valid data.
 * 2. Login the editor user via /auth/editor/login to get auth tokens.
 * 3. Retrieve a page editor session using GET
 *    /flexOffice/editor/pageEditors/{pageEditorId}.
 * 4. Validate the returned page editor session details according to the schema.
 * 5. Test error scenarios: accessing with non-existent ID and unauthorized access.
 */
export async function test_api_flexoffice_page_editor_retrieve_by_id_editor(
  connection: api.IConnection,
) {
  // 1. Register editor user
  const editorCreateBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IFlexOfficeEditor.ICreate;

  const editorAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreateBody,
    });
  typia.assert(editorAuthorized);

  // 2. Editor login
  const editorLoginBody = {
    email: editorCreateBody.email,
    password: editorCreateBody.password,
  } satisfies IFlexOfficeEditor.ILogin;

  const editorLoginAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: editorLoginBody,
    });
  typia.assert(editorLoginAuthorized);

  // 3. Obtain a page editor session object via simulate function
  const simulatedPageEditor: IFlexOfficePageEditor =
    await api.functional.flexOffice.editor.pageEditors.at.simulate(connection, {
      pageEditorId: typia.random<string & tags.Format<"uuid">>(),
    });

  typia.assert(simulatedPageEditor);

  // 4. Successfully retrieve the page editor session by ID
  const retrievedPageEditor: IFlexOfficePageEditor =
    await api.functional.flexOffice.editor.pageEditors.at(connection, {
      pageEditorId: simulatedPageEditor.id,
    });
  typia.assert(retrievedPageEditor);

  // Verify key properties
  TestValidator.equals(
    "pageEditor id matches",
    retrievedPageEditor.id,
    simulatedPageEditor.id,
  );
  TestValidator.equals(
    "pageEditor page_id matches",
    retrievedPageEditor.page_id,
    simulatedPageEditor.page_id,
  );
  TestValidator.equals(
    "pageEditor editor_id matches",
    retrievedPageEditor.editor_id,
    simulatedPageEditor.editor_id,
  );

  // 5. Test error on retrieval with non-existent ID (random UUID unlikely to exist)
  const randomPageEditorId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "Error on retrieval with non-existent pageEditorId",
    async () => {
      await api.functional.flexOffice.editor.pageEditors.at(connection, {
        pageEditorId: randomPageEditorId,
      });
    },
  );

  // 6. Test error on retrieval without authorization
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "Error on retrieval without authorization",
    async () => {
      await api.functional.flexOffice.editor.pageEditors.at(
        unauthenticatedConnection,
        {
          pageEditorId: simulatedPageEditor.id,
        },
      );
    },
  );
}
