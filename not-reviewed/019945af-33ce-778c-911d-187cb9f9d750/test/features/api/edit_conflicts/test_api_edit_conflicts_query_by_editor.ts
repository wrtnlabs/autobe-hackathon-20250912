import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditConflicts } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditConflicts";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeEditConflicts } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeEditConflicts";

/**
 * Test the ability of an Editor user to query edit conflicts with various
 * filters and pagination.
 *
 * This test covers the entire workflow from editor registration and login,
 * through multiple query executions on the /flexOffice/editor/editConflicts
 * PATCH API. It validates the authorization process, filter application,
 * and pagination correctness.
 *
 * Steps:
 *
 * 1. Register a new editor user with a randomized name and email.
 * 2. Login the editor user to obtain authorization tokens.
 * 3. Execute a query with no filters and verify pagination fields.
 * 4. If conflicts exist, query using page_id filter and check the response
 *    data.
 * 5. Further filter results by editor_id and verify correctness.
 * 6. Finally, execute a combined filter query with sorting and validate
 *    results.
 *
 * All API responses are validated using typia.assert and TestValidator to
 * ensure types and business logic compliance.
 */
export async function test_api_edit_conflicts_query_by_editor(
  connection: api.IConnection,
) {
  // 1. Editor registration
  const createBody = {
    name: RandomGenerator.name(),
    email: `${RandomGenerator.name(1)}@example.com`,
    password: "Password123!",
  } satisfies IFlexOfficeEditor.ICreate;

  const authorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, { body: createBody });
  typia.assert(authorized);

  // 2. Editor login
  const loginBody = {
    email: createBody.email,
    password: createBody.password,
  } satisfies IFlexOfficeEditor.ILogin;

  const loggedIn: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, { body: loginBody });
  typia.assert(loggedIn);

  // 3. Query without filters
  const requestBodyEmpty = {
    page: 1,
    limit: 10,
  } satisfies IFlexOfficeEditConflicts.IRequest;

  const responseEmpty: IPageIFlexOfficeEditConflicts.ISummary =
    await api.functional.flexOffice.editor.editConflicts.searchEditConflicts(
      connection,
      { body: requestBodyEmpty },
    );
  typia.assert(responseEmpty);

  TestValidator.predicate(
    "pagination current page should be 1",
    responseEmpty.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should be 10",
    responseEmpty.pagination.limit === 10,
  );

  // 4. Query with page_id filter
  if (responseEmpty.data.length > 0) {
    const pageId = responseEmpty.data[0].page_id;

    const requestBodyPageId = {
      page_id: pageId,
      page: 1,
      limit: 5,
    } satisfies IFlexOfficeEditConflicts.IRequest;

    const responsePageId: IPageIFlexOfficeEditConflicts.ISummary =
      await api.functional.flexOffice.editor.editConflicts.searchEditConflicts(
        connection,
        { body: requestBodyPageId },
      );
    typia.assert(responsePageId);

    for (const item of responsePageId.data) {
      TestValidator.equals(
        "item page_id should match the filter",
        item.page_id,
        pageId,
      );
    }

    // 5. Query with editor_id filter
    if (responsePageId.data.length > 0) {
      const editorId = responsePageId.data[0].editor_id;

      const requestBodyEditorId = {
        editor_id: editorId,
        page: 1,
        limit: 5,
      } satisfies IFlexOfficeEditConflicts.IRequest;

      const responseEditorId: IPageIFlexOfficeEditConflicts.ISummary =
        await api.functional.flexOffice.editor.editConflicts.searchEditConflicts(
          connection,
          { body: requestBodyEditorId },
        );
      typia.assert(responseEditorId);

      for (const item of responseEditorId.data) {
        TestValidator.equals(
          "item editor_id should match the filter",
          item.editor_id,
          editorId,
        );
      }

      // 6. Query with combined filters
      if (responseEditorId.data.length > 0) {
        const combinedFilterBody = {
          page_id: pageId,
          editor_id: editorId,
          page: 1,
          limit: 5,
          orderBy: "created_at",
          orderDir: "desc",
        } satisfies IFlexOfficeEditConflicts.IRequest;

        const combinedResponse: IPageIFlexOfficeEditConflicts.ISummary =
          await api.functional.flexOffice.editor.editConflicts.searchEditConflicts(
            connection,
            { body: combinedFilterBody },
          );
        typia.assert(combinedResponse);

        for (const item of combinedResponse.data) {
          TestValidator.equals(
            "combined filter: page_id should match",
            item.page_id,
            pageId,
          );
          TestValidator.equals(
            "combined filter: editor_id should match",
            item.editor_id,
            editorId,
          );
        }
      }
    }
  }
}
