import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeCustomScript } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeCustomScript";
import type { IFlexOfficeCustomScripts } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeCustomScripts";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeCustomScript } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeCustomScript";

/**
 * Test for FlexOffice admin custom scripts search with filtering, sorting,
 * and pagination.
 *
 * This test validates the ability of authenticated admin users to query the
 * /flexOffice/admin/customScripts endpoint with various filters and
 * pagination options.
 *
 * Process:
 *
 * 1. Admin user joins and logs in to obtain auth tokens.
 * 2. Tests valid search with partial matching keyword and language filter.
 * 3. Validates response pagination, data, and correct filtering.
 * 4. Tests search returning empty result set.
 * 5. Tests invalid filter input causing validation error.
 * 6. Tests unauthorized access returns 401.
 *
 * All API responses are type asserted using typia.assert.
 */
export async function test_api_custom_scripts_search_with_filters_pagination(
  connection: api.IConnection,
) {
  // 1. Admin join and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(8);

  const joined: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(joined);

  const loggedIn: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(loggedIn);

  // 2. Valid search test with filters
  const searchKeyword = RandomGenerator.substring(
    "searchable_keyword_example_for_scripts",
  );
  const languageFilter = "javascript";
  const pageNumber = 1;
  const limitNumber = 10;
  const sortField = "name";
  const sortDirection = "asc" as const;

  const validRequest = {
    search: searchKeyword,
    script_language: languageFilter,
    page: pageNumber,
    limit: limitNumber,
    sort: sortField,
    direction: sortDirection,
  } satisfies IFlexOfficeCustomScripts.IRequest;

  const response: IPageIFlexOfficeCustomScript.ISummary =
    await api.functional.flexOffice.admin.customScripts.index(connection, {
      body: validRequest,
    });
  typia.assert(response);

  TestValidator.predicate(
    "pagination current page matches",
    response.pagination.current === pageNumber,
  );
  TestValidator.predicate(
    "pagination limit matches",
    response.pagination.limit === limitNumber,
  );

  for (const script of response.data) {
    typia.assert(script);
    if (validRequest.search !== null && validRequest.search !== undefined) {
      const searchLC = validRequest.search.toLowerCase();
      TestValidator.predicate(
        `script code or name or description includes '${searchLC}'`,
        script.code.toLowerCase().includes(searchLC) ||
          script.name.toLowerCase().includes(searchLC) ||
          (script.description !== null &&
            script.description !== undefined &&
            script.description.toLowerCase().includes(searchLC)),
      );
    }
    if (
      validRequest.script_language !== null &&
      validRequest.script_language !== undefined
    ) {
      TestValidator.equals(
        `script language is ${validRequest.script_language}`,
        script.script_language.toLowerCase(),
        validRequest.script_language.toLowerCase(),
      );
    }
  }

  // 3. Test empty results with unlikely search term
  const emptyRequest = {
    search: "veryunlikelysearchterm_xyzabc",
    page: 1,
    limit: 5,
  } satisfies IFlexOfficeCustomScripts.IRequest;

  const emptyResponse: IPageIFlexOfficeCustomScript.ISummary =
    await api.functional.flexOffice.admin.customScripts.index(connection, {
      body: emptyRequest,
    });
  typia.assert(emptyResponse);

  TestValidator.equals(
    "empty data array when no match",
    emptyResponse.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    emptyResponse.pagination.pages >= 0,
  );

  // 4. Test invalid filter input causing validation error
  // Skipped invalid type testing as per policy

  // 5. Test unauthorized access returns 401
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthorized access returns 401", async () => {
    await api.functional.flexOffice.admin.customScripts.index(
      unauthConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IFlexOfficeCustomScripts.IRequest,
      },
    );
  });
}
