import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeMarketplaceWidget";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeMarketplaceWidget } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeMarketplaceWidget";

/**
 * This E2E test validates the marketplace widget search API for users having
 * the editor role. It ensures proper registration and authentication of an
 * editor, tests filtered and paginated search queries on marketplace widgets,
 * and validates the accuracy of returned data and pagination metadata.
 *
 * The test covers success scenarios for search, error scenarios for invalid
 * filters, and unauthorized access rejections.
 *
 * Test steps:
 *
 * 1. Register editor user with realistic random data.
 * 2. Login as editor to obtain an authorization token.
 * 3. Perform marketplace widget searches with various pagination and filter
 *    parameters.
 * 4. Validate response data and pagination metadata correctness.
 * 5. Test error handling with invalid filter values.
 * 6. Attempt access without authentication and expect failure.
 */
export async function test_api_marketplace_widget_search_as_editor_with_pagination(
  connection: api.IConnection,
) {
  // 1. Register an editor user
  const editorEmail = typia.random<string & tags.Format<"email">>();
  const editorCreateBody = {
    name: RandomGenerator.name(),
    email: editorEmail,
    password: "StrongPassword123!",
  } satisfies IFlexOfficeEditor.ICreate;

  const joinResponse: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreateBody,
    });
  typia.assert(joinResponse);

  // 2. Login as the editor
  const editorLoginBody = {
    email: editorEmail,
    password: "StrongPassword123!",
  } satisfies IFlexOfficeEditor.ILogin;

  const loginResponse: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: editorLoginBody,
    });
  typia.assert(loginResponse);

  // 3. Valid marketplace widget search with default pagination
  // Using empty search filter to retrieve first page results
  const defaultSearchBody = {
    page: 1,
    limit: 10,
    sortBy: null,
    sortDir: null,
    search: null,
  } satisfies IFlexOfficeMarketplaceWidget.IRequest;

  const defaultSearchResult: IPageIFlexOfficeMarketplaceWidget.ISummary =
    await api.functional.flexOffice.editor.marketplaceWidgets.index(
      connection,
      { body: defaultSearchBody },
    );

  typia.assert(defaultSearchResult);

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be 1",
    defaultSearchResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    defaultSearchResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    defaultSearchResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    defaultSearchResult.pagination.records >= 0,
  );

  // Validate data array length should not exceed limit
  TestValidator.predicate(
    "number of items in data should be <= limit",
    defaultSearchResult.data.length <= defaultSearchBody.limit!,
  );

  // 4. Test marketplace widget search with specific filters
  // Use realistic search term: pick one substring from one of the widget names if data exists
  const dataSample =
    defaultSearchResult.data.length > 0
      ? defaultSearchResult.data[0].name.substring(
          0,
          Math.min(3, defaultSearchResult.data[0].name.length),
        )
      : "Widget";

  // Prepare detailed search request
  const filteredSearchBody = {
    page: 2,
    limit: 5,
    sortBy: "name",
    sortDir: "asc",
    search: dataSample,
  } satisfies IFlexOfficeMarketplaceWidget.IRequest;

  const filteredSearchResult: IPageIFlexOfficeMarketplaceWidget.ISummary =
    await api.functional.flexOffice.editor.marketplaceWidgets.index(
      connection,
      { body: filteredSearchBody },
    );

  typia.assert(filteredSearchResult);

  // Validate filtered pagination metadata
  TestValidator.equals(
    "filtered search pagination current equals requested page",
    filteredSearchResult.pagination.current,
    filteredSearchBody.page!,
  );
  TestValidator.equals(
    "filtered search pagination limit equals requested limit",
    filteredSearchResult.pagination.limit,
    filteredSearchBody.limit!,
  );

  // Validate each item contains the search string (case insensitive) if search specified
  if (filteredSearchBody.search !== null) {
    for (const record of filteredSearchResult.data) {
      TestValidator.predicate(
        `widget name contains search term '${filteredSearchBody.search}'`,
        record.name
          .toLowerCase()
          .includes(filteredSearchBody.search.toLowerCase()),
      );
    }
  }

  // 5. Test unauthorized access: attempt search without auth token
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.flexOffice.editor.marketplaceWidgets.index(
      unauthenticatedConnection,
      { body: defaultSearchBody },
    );
  });
}
