import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeEditConflicts } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditConflicts";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeEditConflicts } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeEditConflicts";

/**
 * E2E test for PATCH /flexOffice/admin/editConflicts endpoint.
 *
 * This test verifies the search and filtering functionality of the edit
 * conflict search API in the FlexOffice admin context.
 *
 * It includes positive tests covering:
 *
 * - Successful admin join authentication
 * - Searching with filters: pageId, editorId, conflictData search string
 * - Pagination controls (page, limit)
 * - Validation of the response structure and data correctness
 *
 * It also includes negative tests for unauthorized access and invalid
 * pagination.
 *
 * The test uses realistic filter data, proper admin authorization, and
 * asserts full type safety and business logic correctness.
 */
export async function test_api_edit_conflicts_search_with_full_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Execute admin join authentication dependency
  const adminCreated: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: `admin_${RandomGenerator.alphaNumeric(6)}@example.com`,
        password: "AdminPass123!",
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(adminCreated);

  // 2. Prepare filter data that represent realistic UUIDs and search strings
  const pageId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const editorId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const conflictDataSearch: string = RandomGenerator.substring(
    "The conflict data contains several fields and values for testing",
  );

  // 3. Execute search with valid filters and pagination
  const pageRequestBody = {
    page_id: pageId,
    editor_id: editorId,
    conflict_data_search: conflictDataSearch,
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    orderBy: "created_at",
    orderDir: "desc" as const,
  } satisfies IFlexOfficeEditConflicts.IRequest;

  const searchResult: IPageIFlexOfficeEditConflicts.ISummary =
    await api.functional.flexOffice.admin.editConflicts.searchEditConflicts(
      connection,
      {
        body: pageRequestBody,
      },
    );
  typia.assert(searchResult);

  // 4. Validate pagination metadata properties
  TestValidator.predicate(
    "pagination current page is positive",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    searchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    searchResult.pagination.pages >= 0,
  );

  // 5. Validate each edit conflict item matches filtered pageId and editorId
  for (const conflict of searchResult.data) {
    typia.assert(conflict);
    TestValidator.equals(
      "each conflict page_id matches filter",
      conflict.page_id,
      pageId,
    );
    TestValidator.equals(
      "each conflict editor_id matches filter",
      conflict.editor_id,
      editorId,
    );
    // created_at should be ISO date-time string (implied by typia.assert)
  }

  // 6. Test boundary condition: empty result with non-matching UUIDs
  const emptyResult =
    await api.functional.flexOffice.admin.editConflicts.searchEditConflicts(
      connection,
      {
        body: {
          page_id: typia.random<string & tags.Format<"uuid">>(),
          editor_id: typia.random<string & tags.Format<"uuid">>(),
          conflict_data_search: "nonexistent string value unlikely to match",
          page: 9999 as number & tags.Type<"int32">,
          limit: 5 as number & tags.Type<"int32">,
          orderBy: "created_at",
          orderDir: "asc",
        } satisfies IFlexOfficeEditConflicts.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty data array on high page",
    emptyResult.data.length,
    0,
  );

  // 7. Negative test: unauthorized access by an unauthenticated connection
  //    Create new connection with empty headers to simulate no auth
  const unauthorizedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized access should throw error",
    async () => {
      await api.functional.flexOffice.admin.editConflicts.searchEditConflicts(
        unauthorizedConn,
        {
          body: {
            page: 1 as number & tags.Type<"int32">,
            limit: 10 as number & tags.Type<"int32">,
          } satisfies IFlexOfficeEditConflicts.IRequest,
        },
      );
    },
  );
}
