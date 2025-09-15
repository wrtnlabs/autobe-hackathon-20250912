import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePage } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePage";
import type { IFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageEditor";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficePageEditor";

export async function test_api_page_editor_session_search_with_filtering_pagination(
  connection: api.IConnection,
) {
  // Step 1: Register a new editor user
  const editorName = RandomGenerator.name();
  const editorEmail = typia.random<string & tags.Format<"email">>();
  const editorPassword = "StrongP@ssw0rd";

  const authorizedEditor1: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: {
        name: editorName,
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ICreate,
    });
  typia.assert(authorizedEditor1);

  // Step 2: Login the editor user
  const loggedInEditor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: {
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ILogin,
    });
  typia.assert(loggedInEditor);

  // Step 3: Create a new UI page to get a valid pageId
  const pageName = RandomGenerator.name();
  const pageDescription = RandomGenerator.paragraph({ sentences: 5 });
  const pageStatus = "draft";

  const createdPage: IFlexOfficePage =
    await api.functional.flexOffice.editor.pages.create(connection, {
      body: {
        name: pageName,
        description: pageDescription,
        status: pageStatus,
        flex_office_page_theme_id: null,
      } satisfies IFlexOfficePage.ICreate,
    });
  typia.assert(createdPage);

  // Step 4: Define a helper to query page editors with given paging and filters
  async function queryPageEditors(
    pageId: string,
    requestBody: IFlexOfficePageEditor.IRequest,
  ): Promise<IPageIFlexOfficePageEditor.ISummary> {
    const response =
      await api.functional.flexOffice.editor.pages.pageEditors.index(
        connection,
        {
          pageId: pageId,
          body: requestBody,
        },
      );
    typia.assert(response);
    return response;
  }

  // Step 5: Normal pagination and filtering test
  const normalRequest: IFlexOfficePageEditor.IRequest = {
    page: 1,
    limit: 10,
    page_id: createdPage.id,
  };
  const normalResponse = await queryPageEditors(createdPage.id, normalRequest);

  // Validate pagination fields
  TestValidator.predicate(
    "pagination current is at least 1",
    normalResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    normalResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    normalResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    normalResponse.pagination.pages >= 0,
  );

  // Validate page coherence
  TestValidator.predicate(
    "pagination pages is coherent",
    normalResponse.pagination.pages ===
      Math.ceil(
        normalResponse.pagination.records / normalResponse.pagination.limit,
      ),
  );

  // Validate all returned editor sessions match the pageId
  for (const editorSession of normalResponse.data) {
    TestValidator.equals(
      "editor session pageId matches filter",
      editorSession.page_id,
      createdPage.id,
    );
  }

  // Step 6: Edge case: Query page editors with page value that returns zero results
  const requestNoResults: IFlexOfficePageEditor.IRequest = {
    page: 9999,
    limit: 10,
    page_id: createdPage.id,
  };
  const noResultsResponse = await queryPageEditors(
    createdPage.id,
    requestNoResults,
  );
  TestValidator.equals(
    "no results data length is zero",
    noResultsResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is zero",
    noResultsResponse.pagination.records,
    0,
  );

  // Step 7: Edge case: Query with invalid editor_id filter (should return empty or matching)
  const invalidEditorId = "00000000-0000-0000-0000-000000000000" as string &
    tags.Format<"uuid">;
  const requestInvalidEditorId: IFlexOfficePageEditor.IRequest = {
    page: 1,
    limit: 10,
    page_id: createdPage.id,
    editor_id: invalidEditorId,
  };
  const invalidEditorIdResponse = await queryPageEditors(
    createdPage.id,
    requestInvalidEditorId,
  );

  // Validate all returned editor sessions match page id and editor id filter
  for (const editorSession of invalidEditorIdResponse.data) {
    TestValidator.equals(
      "editor session pageId matches filter",
      editorSession.page_id,
      createdPage.id,
    );
    TestValidator.equals(
      "editor session editorId matches invalid filter",
      editorSession.editor_id,
      invalidEditorId,
    );
  }

  // Step 8: Authorization check - attempt query without authentication
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.flexOffice.editor.pages.pageEditors.index(
      unauthConnection,
      {
        pageId: createdPage.id,
        body: {
          page: 1,
          limit: 10,
          page_id: createdPage.id,
        } satisfies IFlexOfficePageEditor.IRequest,
      },
    );
  });
}
