import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageEditor";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficePageEditor";

/**
 * Validate searching active page editor sessions with administrative
 * authentication.
 *
 * This test covers the entire admin workflow for querying active page
 * editors:
 *
 * 1. Create admin user by joining through /auth/admin/join.
 * 2. Login as admin user to obtain authorization tokens.
 * 3. Run multiple searches against /flexOffice/admin/pageEditors using the
 *    PATCH method.
 * 4. Validate response correctness including pagination metadata and data
 *    consistency.
 * 5. Validate boundary cases with empty and partial filters.
 * 6. Verify unauthenticated access is rejected.
 */
export async function test_api_page_editor_search_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Join admin user with random valid email and password
  const adminCreateInput = {
    email: RandomGenerator.alphabets(10) + "@example.com",
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IFlexOfficeAdmin.ICreate;

  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateInput,
    });
  typia.assert(adminAuthorized);

  // 2. Login admin user with exact credentials
  const adminLoginInput = {
    email: adminCreateInput.email,
    password: adminCreateInput.password,
  } satisfies IFlexOfficeAdmin.ILogin;

  const adminLoginResult: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginInput,
    });
  typia.assert(adminLoginResult);

  // 3. Prepare some UUIDs for filtering tests
  const randomPageId = typia.random<string & tags.Format<"uuid">>();
  const randomEditorId = typia.random<string & tags.Format<"uuid">>();

  // 4. Test search with filters: page_id and editor_id
  const searchFilter1 = {
    page: 1,
    limit: 10,
    page_id: randomPageId,
    editor_id: randomEditorId,
  } satisfies IFlexOfficePageEditor.IRequest;

  const searchResult1: IPageIFlexOfficePageEditor.ISummary =
    await api.functional.flexOffice.admin.pageEditors.search(connection, {
      body: searchFilter1,
    });
  typia.assert(searchResult1);
  TestValidator.predicate(
    "pagination records should be >= 0",
    searchResult1.pagination.records >= 0,
  );

  // 5. Test search with empty filters (page and limit are optional, test defaults)
  const searchFilter2 = {} satisfies IFlexOfficePageEditor.IRequest;

  const searchResult2: IPageIFlexOfficePageEditor.ISummary =
    await api.functional.flexOffice.admin.pageEditors.search(connection, {
      body: searchFilter2,
    });
  typia.assert(searchResult2);
  TestValidator.predicate(
    "pagination limit should be a positive number",
    searchResult2.pagination.limit > 0,
  );

  // 6. Test search with pagination only (page and limit, no filters)
  const searchFilter3 = {
    page: 2,
    limit: 5,
  } satisfies IFlexOfficePageEditor.IRequest;

  const searchResult3: IPageIFlexOfficePageEditor.ISummary =
    await api.functional.flexOffice.admin.pageEditors.search(connection, {
      body: searchFilter3,
    });
  typia.assert(searchResult3);
  TestValidator.predicate(
    "pagination current should be 2",
    searchResult3.pagination.current === 2,
  );
  TestValidator.predicate(
    "pagination limit should be 5",
    searchResult3.pagination.limit === 5,
  );

  // 7. Test error on unauthorized access by sending request with cleared header
  // We create a fresh connection object without Authorization to simulate no token
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access to admin pageEditors search should fail",
    async () => {
      await api.functional.flexOffice.admin.pageEditors.search(unauthConn, {
        body: searchFilter2,
      });
    },
  );
}
