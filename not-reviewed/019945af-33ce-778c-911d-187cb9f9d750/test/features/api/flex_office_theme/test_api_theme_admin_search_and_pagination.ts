import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTheme";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeTheme";

/**
 * Validate the administrative search and pagination of FlexOffice UI
 * Themes.
 *
 * This test simulates creation of an admin user, login, theme creation, and
 * multiple search queries with pagination and sorting validations.
 *
 * Steps:
 *
 * 1. Join a new admin user
 * 2. Login with the admin credentials
 * 3. Create multiple themes for test data
 * 4. Search themes with no filter using different page and limit parameters
 * 5. Search themes filtered by name substring
 * 6. Verify pagination data (current page, limit, total records, total pages)
 * 7. Verify all returned themes contain expected filter substrings
 * 8. Verify sorting order (ascending and descending by name)
 * 9. Verify empty response on unmatched name filter
 * 10. Verify error thrown on invalid pagination values
 */
export async function test_api_theme_admin_search_and_pagination(
  connection: api.IConnection,
) {
  // 1. Create admin user
  const adminCreateBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Password123!",
  } satisfies IFlexOfficeAdmin.ICreate;
  const createdAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(createdAdmin);

  // 2. Login with admin user
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IFlexOfficeAdmin.ILogin;
  const loggedInAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(loggedInAdmin);

  // 3. Create multiple themes for dataset
  // We create 15 themes with known distinct names for pagination and sorting
  const themeCount = 15;

  const baseNames = ArrayUtil.repeat(
    themeCount,
    (i) => `Theme-${String(i + 1).padStart(2, "0")}`,
  );
  const createdThemes: IFlexOfficeTheme[] = [];
  for (const name of baseNames) {
    const createBody = {
      name,
      css: `.${name.toLowerCase()} { color: #${RandomGenerator.alphaNumeric(6)}; }`,
    } satisfies IFlexOfficeTheme.ICreate;
    const theme = await api.functional.flexOffice.admin.themes.createTheme(
      connection,
      { body: createBody },
    );
    typia.assert(theme);
    createdThemes.push(theme);
  }

  // 4. Search with no filters, page 1, limit 5, ascending order
  const noFilterRequest1 = {
    page: 1,
    limit: 5,
    sortOrder: "asc",
  } satisfies IFlexOfficeTheme.IRequest;
  const page1 = await api.functional.flexOffice.admin.themes.searchThemes(
    connection,
    { body: noFilterRequest1 },
  );
  typia.assert(page1);
  TestValidator.equals("page1 current", page1.pagination.current, 1);
  TestValidator.equals("page1 limit", page1.pagination.limit, 5);
  TestValidator.equals(
    "page1 total records",
    page1.pagination.records,
    themeCount,
  );
  TestValidator.equals(
    "page1 total pages",
    page1.pagination.pages,
    Math.ceil(themeCount / 5),
  );
  TestValidator.equals("page1 data count", page1.data.length, 5);
  // Data names sorted ascending
  for (let i = 1; i < page1.data.length; ++i) {
    TestValidator.predicate(
      `page1 data sort ascending between ${page1.data[i - 1].name} and ${page1.data[i].name}`,
      page1.data[i - 1].name <= page1.data[i].name,
    );
  }

  // 5. Search with no filters, page 2, limit 5, ascending order
  const noFilterRequest2 = {
    page: 2,
    limit: 5,
    sortOrder: "asc",
  } satisfies IFlexOfficeTheme.IRequest;
  const page2 = await api.functional.flexOffice.admin.themes.searchThemes(
    connection,
    { body: noFilterRequest2 },
  );
  typia.assert(page2);
  TestValidator.equals("page2 current", page2.pagination.current, 2);
  TestValidator.equals("page2 limit", page2.pagination.limit, 5);
  TestValidator.equals(
    "page2 total records",
    page2.pagination.records,
    themeCount,
  );
  TestValidator.equals(
    "page2 total pages",
    page2.pagination.pages,
    Math.ceil(themeCount / 5),
  );
  TestValidator.equals("page2 data count", page2.data.length, 5);
  for (let i = 1; i < page2.data.length; ++i) {
    TestValidator.predicate(
      `page2 data sort ascending between ${page2.data[i - 1].name} and ${page2.data[i].name}`,
      page2.data[i - 1].name <= page2.data[i].name,
    );
  }

  // 6. Search with name filter "Theme-0" (matches only Theme-01 to Theme-09)
  const nameFilterRequest = {
    name: "Theme-0",
    sortOrder: "asc",
  } satisfies IFlexOfficeTheme.IRequest;
  const filterResult =
    await api.functional.flexOffice.admin.themes.searchThemes(connection, {
      body: nameFilterRequest,
    });
  typia.assert(filterResult);
  TestValidator.predicate(
    "filtered data size > 0",
    filterResult.data.length > 0,
  );
  for (const theme of filterResult.data) {
    TestValidator.predicate(
      `theme name contains filter substring ${theme.name}`,
      theme.name.includes("Theme-0"),
    );
  }

  // 7. Search with descending order by name
  const descOrderRequest = {
    page: 1,
    limit: 5,
    sortOrder: "desc",
  } satisfies IFlexOfficeTheme.IRequest;
  const descResult = await api.functional.flexOffice.admin.themes.searchThemes(
    connection,
    { body: descOrderRequest },
  );
  typia.assert(descResult);
  for (let i = 1; i < descResult.data.length; ++i) {
    TestValidator.predicate(
      `desc order between ${descResult.data[i - 1].name} and ${descResult.data[i].name}`,
      descResult.data[i - 1].name >= descResult.data[i].name,
    );
  }

  // 8. Search with name filter that matches nothing
  const noMatchRequest = {
    name: "NoSuchThemeName",
    page: 1,
    limit: 5,
  } satisfies IFlexOfficeTheme.IRequest;
  const noMatchResult =
    await api.functional.flexOffice.admin.themes.searchThemes(connection, {
      body: noMatchRequest,
    });
  typia.assert(noMatchResult);
  TestValidator.equals("no matches data length", noMatchResult.data.length, 0);
  TestValidator.equals(
    "no matches total records",
    noMatchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "no matches total pages",
    noMatchResult.pagination.pages,
    0,
  );

  // 9. Test error on negative page number
  await TestValidator.error("negative page number throws error", async () => {
    await api.functional.flexOffice.admin.themes.searchThemes(connection, {
      body: { page: -1, limit: 5 } satisfies IFlexOfficeTheme.IRequest,
    });
  });

  // 10. Test error on zero or negative limit
  await TestValidator.error("zero limit throws error", async () => {
    await api.functional.flexOffice.admin.themes.searchThemes(connection, {
      body: { page: 1, limit: 0 } satisfies IFlexOfficeTheme.IRequest,
    });
  });
  await TestValidator.error("negative limit throws error", async () => {
    await api.functional.flexOffice.admin.themes.searchThemes(connection, {
      body: { page: 1, limit: -10 } satisfies IFlexOfficeTheme.IRequest,
    });
  });
}
