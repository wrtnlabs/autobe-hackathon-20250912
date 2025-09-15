import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageTheme";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficePageTheme";

/**
 * This test validates the search functionality of UI page themes in the
 * FlexOffice admin panel.
 *
 * Workflow:
 *
 * 1. Perform admin user registration.
 * 2. Perform admin user login.
 * 3. Execute multiple search queries with different filters (empty, name
 *    filter, pagination).
 * 4. Validate response structure and pagination information.
 * 5. Confirm access control by attempting the operation without
 *    authentication.
 */
export async function test_api_admin_search_page_themes(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "TestPassword123!";
  const joinBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ICreate;

  const authorizedAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Admin login
  const loginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ILogin;

  const loginAuthorizedAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(loginAuthorizedAdmin);

  // 3. Test search with empty filter parameters
  const emptyFilter: IFlexOfficePageTheme.IRequest = {
    name: null,
    page: 1,
    limit: 10,
  } satisfies IFlexOfficePageTheme.IRequest;

  const emptyFilterResult: IPageIFlexOfficePageTheme.ISummary =
    await api.functional.flexOffice.admin.pageThemes.index(connection, {
      body: emptyFilter,
    });
  typia.assert(emptyFilterResult);

  TestValidator.predicate(
    "pagination current page is 1 for empty filter",
    emptyFilterResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit equals request limit for empty filter",
    emptyFilterResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages is at least 1 for empty filter",
    emptyFilterResult.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "returned data array is not undefined",
    Array.isArray(emptyFilterResult.data),
  );

  // 4. Test search with a name filter if there are any themes
  if (emptyFilterResult.data.length > 0) {
    const firstName = emptyFilterResult.data[0].name;
    const nameFilter: IFlexOfficePageTheme.IRequest = {
      name: firstName,
      page: 1,
      limit: 5,
    } satisfies IFlexOfficePageTheme.IRequest;

    const nameFilterResult: IPageIFlexOfficePageTheme.ISummary =
      await api.functional.flexOffice.admin.pageThemes.index(connection, {
        body: nameFilter,
      });
    typia.assert(nameFilterResult);

    TestValidator.predicate(
      `all names include '${firstName}' in filtered result`,
      nameFilterResult.data.every((theme) => theme.name.includes(firstName)),
    );
  }

  // 5. Test pagination limits and page numbers
  const paginationFilter: IFlexOfficePageTheme.IRequest = {
    name: null,
    page: 2,
    limit: 2,
  } satisfies IFlexOfficePageTheme.IRequest;

  const paginationResult: IPageIFlexOfficePageTheme.ISummary =
    await api.functional.flexOffice.admin.pageThemes.index(connection, {
      body: paginationFilter,
    });
  typia.assert(paginationResult);

  TestValidator.equals(
    "pagination current page equals requested page",
    paginationResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit equals requested limit",
    paginationResult.pagination.limit,
    2,
  );

  // 6. Test unauthorized access
  // Make unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated access to search pageThemes should fail",
    async () => {
      await api.functional.flexOffice.admin.pageThemes.index(unauthConn, {
        body: emptyFilter,
      });
    },
  );
}
