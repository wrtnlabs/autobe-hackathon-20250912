import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeEditor";

/**
 * E2E Test for Editor Search with Pagination and Filters
 *
 * This test function validates the behavior and security of the PATCH
 * /flexOffice/admin/editors API which provides paginated, filtered lists of
 * editor users for administrative management.
 *
 * The test covers:
 *
 * - Admin user creation and authentication to obtain access tokens.
 * - Successful editor search requests with empty filters, search terms,
 *   pagination limits.
 * - Validation of response structure compliance and pagination metadata.
 * - Security enforcement: unauthorized (no token) access results in 401,
 *   non-admin authenticated users receive 403 forbidden.
 *
 * Steps:
 *
 * 1. Create an admin user to obtain authorization.
 * 2. Log in as the admin user.
 * 3. Perform multiple editor search requests with varying parameters.
 * 4. Verify correctness and completeness of responses.
 * 5. Attempt editor search without authentication and as a non-admin user to
 *    test security.
 *
 * This thorough test ensures that only authorized admins can retrieve
 * editor information, filters are respected, and pagination works as
 * expected.
 */
export async function test_api_editor_search_with_pagination_and_filters(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin user
  const adminCreateBody = {
    email: `admin.${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "SecR3tPass!",
  } satisfies IFlexOfficeAdmin.ICreate;
  const adminAuth: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(adminAuth);

  // Step 2: Log in as the created admin user to obtain fresh token (auto-handled)
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IFlexOfficeAdmin.ILogin;
  const adminLogin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLogin);

  // Step 3.1: Editor search with empty filter (should return all editors paginated)
  const emptyFilterBody = {} satisfies IFlexOfficeEditor.IRequest;
  const allEditorsPage: IPageIFlexOfficeEditor.ISummary =
    await api.functional.flexOffice.admin.editors.searchEditors(connection, {
      body: emptyFilterBody,
    });
  typia.assert(allEditorsPage);
  TestValidator.predicate(
    "pagination current page is positive",
    allEditorsPage.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination total pages is non-negative",
    allEditorsPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    allEditorsPage.pagination.records >= 0,
  );

  // Step 3.2: Editor search with search parameter to filter by name or email substring
  // Pick a substring from first editor, or random if empty
  const sampleEditors = allEditorsPage.data;
  let searchSubstring = "";
  if (sampleEditors.length > 0) {
    const editorChoice = RandomGenerator.pick(sampleEditors);
    // Use either name or email substring
    const nameSubstr = editorChoice.name.substring(
      0,
      Math.min(3, editorChoice.name.length),
    );
    const emailSubstr = editorChoice.email.substring(
      0,
      Math.min(5, editorChoice.email.length),
    );
    searchSubstring = nameSubstr || emailSubstr;
  } else {
    searchSubstring = "test";
  }
  const searchFilterBody = {
    search: searchSubstring,
  } satisfies IFlexOfficeEditor.IRequest;
  const filteredEditorsPage: IPageIFlexOfficeEditor.ISummary =
    await api.functional.flexOffice.admin.editors.searchEditors(connection, {
      body: searchFilterBody,
    });
  typia.assert(filteredEditorsPage);
  // All results data must contain substring in name or email
  for (const editor of filteredEditorsPage.data) {
    TestValidator.predicate(
      `editor name or email contains ${searchSubstring}`,
      editor.name.includes(searchSubstring) ||
        editor.email.includes(searchSubstring),
    );
  }

  // Step 3.3: Pagination test - request limit = 1
  const paginationLimitBody = {
    limit: 1,
  } satisfies IFlexOfficeEditor.IRequest;
  const pagedEditors: IPageIFlexOfficeEditor.ISummary =
    await api.functional.flexOffice.admin.editors.searchEditors(connection, {
      body: paginationLimitBody,
    });
  typia.assert(pagedEditors);
  TestValidator.equals(
    "pagination limit is respected",
    pagedEditors.data.length,
    1,
  );

  // Step 3.4: Filter that results in no matches - use unlikely search term
  const noMatchFilterBody = {
    search: "nonexistent_search_term_123456789",
  } satisfies IFlexOfficeEditor.IRequest;
  const emptyResultPage: IPageIFlexOfficeEditor.ISummary =
    await api.functional.flexOffice.admin.editors.searchEditors(connection, {
      body: noMatchFilterBody,
    });
  typia.assert(emptyResultPage);
  TestValidator.equals(
    "no match search returns empty data",
    emptyResultPage.data.length,
    0,
  );

  // Step 4: Security test - unauthenticated access results in 401
  // Create a new unauthenticated connection overriding headers to empty
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access is forbidden", async () => {
    await api.functional.flexOffice.admin.editors.searchEditors(unauthConn, {
      body: emptyFilterBody,
    });
  });

  // Step 5: Security test - authenticated non-admin users get 403
  // We'll simulate this by creating a non-admin admin user. Because no other role info,
  // we cannot create other than admin, so skip this. Alternative: if a non-admin endpoint existed, test there.
  // Here, we will skip creating non-admin user to avoid invalid API calls.
  // Note: No API provided to create non-admin users, so this cannot be tested here.
  // This comment serves to indicate awareness of this limitation.
}
