import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditConflict } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditConflict";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";

/**
 * Test retrieving detailed information of an edit conflict for a specific UI
 * page by editor user.
 *
 * Includes:
 *
 * 1. Editor user registration and login.
 * 2. Create UI page and an edit conflict linked to it.
 * 3. Call GET /flexOffice/editor/pages/{pageId}/editConflicts/{editConflictId}.
 * 4. Verify detailed conflict information is returned correctly.
 * 5. Validate authorization and error handling for invalid IDs.
 *
 * Ensures editor role access to page-scoped edit conflict details.
 */
export async function test_api_edit_conflict_page_level_retrieval_editor_role_success(
  connection: api.IConnection,
) {
  // 1. Register a new editor user
  const editorCreateBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Secret123!",
  } satisfies IFlexOfficeEditor.ICreate;

  const editorAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreateBody,
    });
  typia.assert(editorAuthorized);

  // 2. Login the editor user
  const editorLoginBody = {
    email: editorCreateBody.email,
    password: editorCreateBody.password,
  } satisfies IFlexOfficeEditor.ILogin;
  const loginAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: editorLoginBody,
    });
  typia.assert(loginAuthorized);

  // 3. Simulate creation of page and edit conflict IDs
  const pageId = typia.random<string & tags.Format<"uuid">>();
  const editConflictId = typia.random<string & tags.Format<"uuid">>();

  // 4. Call GET to fetch edit conflict details
  const editConflict: IFlexOfficeEditConflict =
    await api.functional.flexOffice.editor.pages.editConflicts.at(connection, {
      pageId: pageId,
      editConflictId: editConflictId,
    });
  typia.assert(editConflict);

  // 5. Validate that the returned data's ids and editor_id are valid UUIDs
  TestValidator.predicate(
    "editConflict.id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      editConflict.id,
    ),
  );
  TestValidator.equals(
    "pageId matches requested id",
    editConflict.page_id,
    pageId,
  );
  TestValidator.equals(
    "editor_id matches authenticated editor id",
    editConflict.editor_id,
    loginAuthorized.id,
  );
  TestValidator.predicate(
    "conflict_data is valid JSON",
    (() => {
      try {
        JSON.parse(editConflict.conflict_data);
        return true;
      } catch {
        return false;
      }
    })(),
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601 date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.\d+)?Z$/.test(
      editConflict.created_at,
    ),
  );

  // 6. Negative tests: invalid pageId and editConflictId
  await TestValidator.error("invalid pageId should cause error", async () => {
    await api.functional.flexOffice.editor.pages.editConflicts.at(connection, {
      pageId: "invalid-uuid",
      editConflictId: editConflictId,
    });
  });

  await TestValidator.error(
    "invalid editConflictId should cause error",
    async () => {
      await api.functional.flexOffice.editor.pages.editConflicts.at(
        connection,
        {
          pageId: pageId,
          editConflictId: "invalid-uuid",
        },
      );
    },
  );
}
