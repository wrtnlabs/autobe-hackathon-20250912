import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeDataSource";

/**
 * This E2E test validates the search and retrieval functionality for
 * external data sources from the perspective of an editor user in the
 * FlexOffice system. The test workflow is:
 *
 * 1. Register a new editor account (join) with realistic credentials.
 * 2. Log in as the editor to obtain authorization tokens.
 * 3. Create multiple data source entries with diverse names, types, and active
 *    flags.
 * 4. Perform PATCH /flexOffice/editor/dataSources with various filter
 *    parameters:
 *
 *    - No filters (default search).
 *    - Filter by name (partial match).
 *    - Filter by type.
 *    - Filter by is_active flag.
 *    - Pagination checks with different page and limit values.
 * 5. Verify that the pagination metadata and returned summaries match expected
 *    filters and counts.
 * 6. Attempt unauthorized access (try searching without authentication) and
 *    verify error.
 * 7. Attempt malformed requests (invalid page/limit values) and verify error.
 *
 * All API responses are type-asserted with typia.assert for correctness.
 * TestValidator functions are used with descriptive titles for all
 * assertions.
 *
 * This test reflects realistic business scenarios, asserts comprehensive
 * correctness, and respects all DTO and API function contracts.
 */
export async function test_api_editor_data_sources_search_filtered_pagination(
  connection: api.IConnection,
) {
  // Step 1: Editor user registration (join) with random but realistic data
  const editorName = RandomGenerator.name();
  const editorEmail = typia.random<string & tags.Format<"email">>();
  const editorPassword = "validPassword123";
  const editorAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: {
        name: editorName,
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ICreate,
    });
  typia.assert(editorAuthorized);

  // Step 2: Editor login
  const editorLoggedIn: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: {
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ILogin,
    });
  typia.assert(editorLoggedIn);

  // Setting authentication header is handled automatically by SDK

  // Step 3: Create multiple data sources with diverse attributes
  const dataSourceTypes = [
    "mysql",
    "postgresql",
    "google_sheet",
    "excel",
  ] as const;
  const createdDataSources: IFlexOfficeDataSource[] = [];
  for (let i = 0; i < 10; ++i) {
    const name = `${RandomGenerator.name(2)} DataSource ${i + 1}`;
    const type = RandomGenerator.pick(dataSourceTypes);
    const connectionInfo = `conn-string-${i + 1}`;
    const isActive = i % 2 === 0; // even indices active, odd inactive
    const created = await api.functional.flexOffice.editor.dataSources.create(
      connection,
      {
        body: {
          name,
          type,
          connection_info: connectionInfo,
          is_active: isActive,
          deleted_at: null,
        } satisfies IFlexOfficeDataSource.ICreate,
      },
    );
    typia.assert(created);
    createdDataSources.push(created);
  }

  // Step 4: Perform search (PATCH) requests with various filters

  // 4a: No filters (default) search
  const allSearchResult: IPageIFlexOfficeDataSource.ISummary =
    await api.functional.flexOffice.editor.dataSources.index(connection, {
      body: {},
    });
  typia.assert(allSearchResult);
  TestValidator.predicate(
    "pagination current page is >= 1",
    allSearchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    allSearchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= created data sources",
    allSearchResult.pagination.records >= createdDataSources.length,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    allSearchResult.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "data array length <= limit",
    allSearchResult.data.length <= allSearchResult.pagination.limit,
  );

  // 4b: Filter by partial matching name substrings from created data sources
  const sampleName = createdDataSources[0].name.split(" ")[0]; // first word
  const partialNameResult: IPageIFlexOfficeDataSource.ISummary =
    await api.functional.flexOffice.editor.dataSources.index(connection, {
      body: { name: sampleName },
    });
  typia.assert(partialNameResult);
  TestValidator.predicate(
    "filter by name returns only matching names",
    partialNameResult.data.every((ds) => ds.name.includes(sampleName)),
  );

  // 4c: Filter by type
  const filterType = "mysql";
  const filterByTypeResult: IPageIFlexOfficeDataSource.ISummary =
    await api.functional.flexOffice.editor.dataSources.index(connection, {
      body: { type: filterType },
    });
  typia.assert(filterByTypeResult);
  TestValidator.predicate(
    "filter by type returns only matching types",
    filterByTypeResult.data.every((ds) => ds.type === filterType),
  );

  // 4d: Filter by is_active = true
  const activeFilterResult: IPageIFlexOfficeDataSource.ISummary =
    await api.functional.flexOffice.editor.dataSources.index(connection, {
      body: { is_active: true },
    });
  typia.assert(activeFilterResult);
  TestValidator.predicate(
    "filter by is_active returns only active sources",
    activeFilterResult.data.every((ds) => ds.is_active === true),
  );

  // 4e: Pagination test: limit = 3, page = 2
  const paginationResult: IPageIFlexOfficeDataSource.ISummary =
    await api.functional.flexOffice.editor.dataSources.index(connection, {
      body: { limit: 3, page: 2 },
    });
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination limit matches request",
    paginationResult.pagination.limit,
    3,
  );
  TestValidator.equals(
    "pagination current page matches request",
    paginationResult.pagination.current,
    2,
  );
  TestValidator.predicate(
    "pagination records >= created data sources",
    paginationResult.pagination.records >= createdDataSources.length,
  );
  TestValidator.equals(
    "pagination pages matches ceiling(records/limit)",
    paginationResult.pagination.pages,
    Math.ceil(paginationResult.pagination.records / 3),
  );
  TestValidator.predicate(
    "data array length <= limit",
    paginationResult.data.length <= 3,
  );

  // Step 5: Unauthorized search attempt - reset connection headers to empty
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "search without authorization should fail",
    async () => {
      await api.functional.flexOffice.editor.dataSources.index(unauthConn, {
        body: {},
      });
    },
  );

  // Step 6: Malformed request - invalid page, expect failure
  await TestValidator.error(
    "invalid pagination page (negative) fails",
    async () => {
      await api.functional.flexOffice.editor.dataSources.index(connection, {
        body: { page: -1 },
      });
    },
  );

  // Step 7: Malformed request - invalid limit (zero), expect failure
  await TestValidator.error(
    "invalid pagination limit (zero) fails",
    async () => {
      await api.functional.flexOffice.editor.dataSources.index(connection, {
        body: { limit: 0 },
      });
    },
  );
}
