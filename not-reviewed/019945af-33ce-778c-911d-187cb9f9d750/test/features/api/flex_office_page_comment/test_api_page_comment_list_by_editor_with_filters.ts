import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficePageComment";

export async function test_api_page_comment_list_by_editor_with_filters(
  connection: api.IConnection,
) {
  // Step 1: Register a new editor user
  const createEditorBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8),
  } satisfies IFlexOfficeEditor.ICreate;
  const editorAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: createEditorBody,
    });
  typia.assert(editorAuthorized);

  // Step 2: Login as the editor user
  const loginEditorBody = {
    email: createEditorBody.email,
    password: createEditorBody.password,
  } satisfies IFlexOfficeEditor.ILogin;
  const editorLoginAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: loginEditorBody,
    });
  typia.assert(editorLoginAuthorized);

  // Step 3: Create a realistic UUID for an existing pageId
  const targetPageId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 4: Prepare filter request body for page comments list
  // Here we use editor_id to filter comments by current logged-in editor
  // Include pagination with page and limit
  const filterBody = {
    page_id: targetPageId,
    editor_id: editorAuthorized.id,
    search: RandomGenerator.substring(
      "Example search content for comment filter.",
    ),
    page: 1,
    limit: 10,
  } satisfies IFlexOfficePageComment.IRequest;

  // Step 5: Call the PATCH /flexOffice/editor/pages/{pageId}/pageComments with filters
  const pageCommentsSummary: IPageIFlexOfficePageComment.ISummary =
    await api.functional.flexOffice.editor.pages.pageComments.index(
      connection,
      {
        pageId: targetPageId,
        body: filterBody,
      },
    );
  typia.assert(pageCommentsSummary);

  // Step 6: Validate pagination fields
  TestValidator.equals(
    "pagination current page matches request",
    pageCommentsSummary.pagination.current,
    filterBody.page ?? 1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    pageCommentsSummary.pagination.limit,
    filterBody.limit ?? 10,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    pageCommentsSummary.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is positive",
    pageCommentsSummary.pagination.pages > 0,
  );

  // Step 7: Validate each comment matches filters
  pageCommentsSummary.data.forEach((comment) => {
    typia.assert(comment); // Full schema validation of IFlexOfficePageComment.ISummary
    TestValidator.equals(
      "comment has editor_id equal to logged-in editor",
      comment.editor_id,
      editorAuthorized.id,
    );
    TestValidator.predicate(
      "comment content contains search term or search is empty",
      !filterBody.search ||
        filterBody.search.length === 0 ||
        comment.content.includes(filterBody.search),
    );
  });
}
