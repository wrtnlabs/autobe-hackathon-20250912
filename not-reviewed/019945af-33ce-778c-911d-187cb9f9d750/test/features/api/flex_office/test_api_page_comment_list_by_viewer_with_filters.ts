import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComment";
import type { IFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeViewer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficePageComment";

/**
 * Test the viewer's ability to list and filter page comments securely and
 * correctly.
 *
 * Business context: Viewers represent users with read-only access to FlexOffice
 * UI pages. Viewing comments requires authentication and authorization.
 * Pagination and filtering enable effective browsing of potentially large
 * comment sets. This test ensures security and correctness of viewer page
 * comment listing with filters.
 *
 * Steps:
 *
 * 1. Viewer user joins and obtains JWT token.
 * 2. Viewer user logs in to confirm authorization.
 * 3. The viewer fetches page comments using the API, providing filters including
 *    pageId, editorId (optional), search (null), page number, and limit.
 * 4. Validates paginated response with correct filters applied.
 * 5. Validates error behavior for unauthorized calls.
 */
export async function test_api_page_comment_list_by_viewer_with_filters(
  connection: api.IConnection,
) {
  // 1. Create and authenticate viewer user
  const viewerCreateBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IFlexOfficeViewer.ICreate;

  const authorizedViewer: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.join(connection, {
      body: viewerCreateBody,
    });
  typia.assert(authorizedViewer);

  // 2. Login again to confirm authorization
  const viewerLoginBody = {
    email: viewerCreateBody.email,
    password: viewerCreateBody.password,
  } satisfies IFlexOfficeViewer.ILogin;

  const loginAuthorized: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.login(connection, {
      body: viewerLoginBody,
    });
  typia.assert(loginAuthorized);

  // 3. Prepare list request body with filters
  const pageId = typia.random<string & tags.Format<"uuid">>();
  const editorId = typia.random<string & tags.Format<"uuid">>();
  const listRequestBody = {
    page_id: pageId,
    editor_id: editorId,
    search: null,
    page: 1,
    limit: 10,
  } satisfies IFlexOfficePageComment.IRequest;

  // 4. Fetch page comments with filters
  const response: IPageIFlexOfficePageComment.ISummary =
    await api.functional.flexOffice.viewer.pages.pageComments.index(
      connection,
      {
        pageId: pageId,
        body: listRequestBody,
      },
    );
  typia.assert(response);

  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page must be 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit must be 10",
    response.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages must be positive or zero",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records must be non-negative",
    response.pagination.records >= 0,
  );

  // 6. Validate each comment
  for (const comment of response.data) {
    typia.assert(comment);
    TestValidator.equals(
      "comment editor_id matches filter",
      comment.editor_id,
      editorId,
    );
  }

  // 7. Test unauthorized access
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized access should throw", async () => {
    await api.functional.flexOffice.viewer.pages.pageComments.index(
      unauthenticatedConnection,
      {
        pageId: pageId,
        body: listRequestBody,
      },
    );
  });
}
