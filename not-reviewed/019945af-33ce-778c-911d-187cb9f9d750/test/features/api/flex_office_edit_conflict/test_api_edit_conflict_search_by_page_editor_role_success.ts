import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditConflict } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditConflict";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeEditConflict } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeEditConflict";

/**
 * This test validates edit conflict search by page for an editor role user. It
 * covers join and login of an editor, edit conflict query for a pageId with
 * filters and pagination, response validation, unauthorized access, and invalid
 * pageId error handling.
 */
export async function test_api_edit_conflict_search_by_page_editor_role_success(
  connection: api.IConnection,
) {
  // 1. Editor join
  const editorCreate = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Passw0rd!",
  } satisfies IFlexOfficeEditor.ICreate;

  const authorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreate,
    });
  typia.assert(authorized);
  TestValidator.predicate(
    "Authorization token exists",
    authorized.token.access.length > 0,
  );

  // 2. Editor login
  const editorLogin = {
    email: editorCreate.email,
    password: editorCreate.password,
  } satisfies IFlexOfficeEditor.ILogin;

  const loggedIn: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: editorLogin,
    });
  typia.assert(loggedIn);
  TestValidator.predicate(
    "Logged in access token exists",
    loggedIn.token.access.length > 0,
  );

  // 3. Prepare pageId
  const pageId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Prepare search filter body with multiple conflict entries for realism
  // In absence of API to create conflicts, simulate plausible values for search filter
  const requestBody = {
    page_id: pageId,
    editor_id: authorized.id,
    conflict_data_search: RandomGenerator.substring("conflict data example"),
    created_at_from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    created_at_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    page: 1,
    limit: 10,
    orderBy: "created_at",
    orderDir: "desc",
  } satisfies IFlexOfficeEditConflict.IRequest;

  // 5. Execute edit conflict search by pageId
  const searchResult: IPageIFlexOfficeEditConflict =
    await api.functional.flexOffice.editor.pages.editConflicts.index(
      connection,
      {
        pageId,
        body: requestBody,
      },
    );
  typia.assert(searchResult);

  // 6. Validate pagination and conflict entries
  TestValidator.predicate(
    "Pagination current page >= 1",
    searchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "Pagination limit > 0",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "Pagination records >= 0",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "Pagination pages >= 0",
    searchResult.pagination.pages >= 0,
  );

  for (const conflict of searchResult.data) {
    typia.assert<IFlexOfficeEditConflict>(conflict);
    TestValidator.equals("Conflict page_id matches", conflict.page_id, pageId);
    TestValidator.equals(
      "Conflict editor_id matches",
      conflict.editor_id,
      authorized.id,
    );
    TestValidator.predicate(
      "Conflict data string not empty",
      conflict.conflict_data.length > 0,
    );
  }

  // 7. Unauthorized access test
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("Unauthorized access should fail", async () => {
    await api.functional.flexOffice.editor.pages.editConflicts.index(
      unauthConnection,
      {
        pageId,
        body: requestBody,
      },
    );
  });

  // 8. Invalid pageId format test
  await TestValidator.error("Invalid pageId should cause error", async () => {
    await api.functional.flexOffice.editor.pages.editConflicts.index(
      connection,
      {
        pageId: "invalid-uuid-format" as string & tags.Format<"uuid">,
        body: requestBody,
      },
    );
  });
}
