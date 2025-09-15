import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageTheme";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficePageTheme } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficePageTheme";

/**
 * Test searching and retrieving FlexOffice UI page themes as an
 * authenticated editor user.
 *
 * The test executes the following steps:
 *
 * 1. Create editor user account.
 * 2. Login as the editor user.
 * 3. Search all page themes with no filter (default pagination).
 * 4. Search with specific name filter and validate filtered results.
 * 5. Search with a name that matches no records and verify no data returned.
 * 6. Test pagination parameters (page, limit) and validate pagination data.
 * 7. Validate that invalid pagination params cause an error.
 * 8. Validate that unauthorized requests fail due to missing auth.
 *
 * All responses are validated using typia.assert for perfect type safety.
 * TestValidator is used for assertions with clear descriptive messages.
 */
export async function test_api_editor_search_page_themes(
  connection: api.IConnection,
) {
  // 1. Create editor user account
  const editorCreateBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
  } satisfies IFlexOfficeEditor.ICreate;

  const editorAuth: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreateBody,
    });
  typia.assert(editorAuth);

  // 2. Login as editor user
  const editorLoginBody = {
    email: editorCreateBody.email,
    password: editorCreateBody.password,
  } satisfies IFlexOfficeEditor.ILogin;

  const editorLoginAuth: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: editorLoginBody,
    });
  typia.assert(editorLoginAuth);

  // 3. Search all themes without filters (default pagination)
  const defaultSearchBody = {} satisfies IFlexOfficePageTheme.IRequest;
  const defaultPage: IPageIFlexOfficePageTheme.ISummary =
    await api.functional.flexOffice.editor.pageThemes.index(connection, {
      body: defaultSearchBody,
    });
  typia.assert(defaultPage);
  TestValidator.predicate(
    "default page should have valid pagination",
    defaultPage.pagination !== null &&
      typeof defaultPage.pagination.current === "number",
  );

  // 4. Search with specific name filter assuming some themes exist
  if (defaultPage.data.length > 0) {
    const someName = defaultPage.data[0].name;

    const nameSearchBody = {
      name: someName,
      page: 1,
      limit: 5,
    } satisfies IFlexOfficePageTheme.IRequest;

    const nameFilteredPage: IPageIFlexOfficePageTheme.ISummary =
      await api.functional.flexOffice.editor.pageThemes.index(connection, {
        body: nameSearchBody,
      });
    typia.assert(nameFilteredPage);
    TestValidator.predicate(
      "name filtered page data has at least one item",
      nameFilteredPage.data.length > 0,
    );
    // Every data item's name matches the filter
    for (const theme of nameFilteredPage.data) {
      TestValidator.equals(
        `each filtered theme name should equal ${someName}`,
        theme.name,
        someName,
      );
    }
  }

  // 5. Search with no matches
  const noMatchSearchBody = {
    name: "NoSuchThemeShouldExist",
    page: 1,
    limit: 10,
  } satisfies IFlexOfficePageTheme.IRequest;

  const noMatchPage: IPageIFlexOfficePageTheme.ISummary =
    await api.functional.flexOffice.editor.pageThemes.index(connection, {
      body: noMatchSearchBody,
    });
  typia.assert(noMatchPage);
  TestValidator.equals(
    "no match page data length is 0",
    noMatchPage.data.length,
    0,
  );

  // 6. Testing pagination: page 2 with limit 2
  const paginationSearchBody = {
    page: 2,
    limit: 2,
  } satisfies IFlexOfficePageTheme.IRequest;

  const paginationPage: IPageIFlexOfficePageTheme.ISummary =
    await api.functional.flexOffice.editor.pageThemes.index(connection, {
      body: paginationSearchBody,
    });
  typia.assert(paginationPage);

  // The pagination object must respect bounds
  TestValidator.predicate(
    "pagination current page is 2 or more",
    paginationPage.pagination.current >= 2,
  );
  TestValidator.equals(
    "pagination limit is 2",
    paginationPage.pagination.limit,
    2,
  );

  // 7. Test invalid pagination parameters result in errors
  await TestValidator.error(
    "invalid pagination parameters should throw",
    async () => {
      await api.functional.flexOffice.editor.pageThemes.index(connection, {
        body: {
          page: 0,
          limit: 0,
        } satisfies IFlexOfficePageTheme.IRequest,
      });
    },
  );

  // 8. Test unauthorized access with empty or new connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized access without auth should fail",
    async () => {
      await api.functional.flexOffice.editor.pageThemes.index(unauthConn, {
        body: {} satisfies IFlexOfficePageTheme.IRequest,
      });
    },
  );
}
