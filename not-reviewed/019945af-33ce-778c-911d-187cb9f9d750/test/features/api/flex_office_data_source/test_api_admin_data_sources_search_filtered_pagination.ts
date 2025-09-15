import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeDataSource";

/**
 * This test validates the administrator's ability to search and retrieve data
 * sources using the PATCH /flexOffice/admin/dataSources API with filtering and
 * pagination.
 *
 * The workflow includes: authenticating an admin user via join and login;
 * creating multiple data sources of various types (MySQL, PostgreSQL, Google
 * Sheets) using the creation API; executing several search queries with
 * different filter parameters to verify filtering by name, type, and active
 * status; verifying pagination behavior including total record count, pages,
 * current page, and limits; and ensuring response data correctness by type
 * assertion and business logic checks. Edge cases such as empty search results
 * and mixed search conditions are included. Throughout, the test uses realistic
 * values following DTO constraints and ensures all required fields are properly
 * set with correct types and formats. Authentication headers are managed
 * automatically by the SDK. Assertions confirm API responses meet expectations
 * in terms of structure and business rules.
 */
export async function test_api_admin_data_sources_search_filtered_pagination(
  connection: api.IConnection,
) {
  // 1. Admin user join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "adminPassword123";
  const joinBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ICreate;
  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(adminAuthorized);

  // 2. Admin user login
  const loginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ILogin;
  const loginAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: loginBody });
  typia.assert(loginAuthorized);

  // 3. Create multiple test data sources
  type DataSourceCreate = IFlexOfficeDataSource.ICreate;
  // Prepare specific data sources with known types and connection info.
  const dataSourcesToCreate: DataSourceCreate[] = [
    {
      name: "Test MySQL Source",
      type: "mysql",
      connection_info: JSON.stringify({ host: "localhost", port: 3306 }),
      is_active: true,
      deleted_at: null,
    },
    {
      name: "Test PostgreSQL Source",
      type: "postgresql",
      connection_info: JSON.stringify({ host: "localhost", port: 5432 }),
      is_active: true,
      deleted_at: null,
    },
    {
      name: "Test Google Sheet",
      type: "google_sheet",
      connection_info: JSON.stringify({ sheetId: "sheet-12345" }),
      is_active: false,
      deleted_at: null,
    },
    {
      name: "Inactive MySQL Source",
      type: "mysql",
      connection_info: JSON.stringify({ host: "192.168.1.100", port: 3306 }),
      is_active: false,
      deleted_at: null,
    },
    {
      name: "Active Excel Source",
      type: "excel",
      connection_info: JSON.stringify({ file: "file123.xlsx" }),
      is_active: true,
      deleted_at: null,
    },
  ];

  const createdDataSources: IFlexOfficeDataSource[] = [];
  for (const item of dataSourcesToCreate) {
    const created = await api.functional.flexOffice.admin.dataSources.create(
      connection,
      {
        body: item,
      },
    );
    typia.assert(created);
    TestValidator.predicate(
      "created data source has correct type",
      created.type === item.type,
    );
    TestValidator.predicate(
      "created data source has correct name",
      created.name === item.name,
    );
    createdDataSources.push(created);
  }

  // 4. Search without filters - check pagination defaults
  const searchNoFilters =
    await api.functional.flexOffice.admin.dataSources.index(connection, {
      body: {},
    });
  typia.assert(searchNoFilters);
  TestValidator.predicate(
    "pagination current page >= 0",
    searchNoFilters.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    searchNoFilters.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= created sources",
    searchNoFilters.pagination.records >= createdDataSources.length,
  );

  // 5. Search by type = 'mysql'
  const searchByTypeMySQL =
    await api.functional.flexOffice.admin.dataSources.index(connection, {
      body: { type: "mysql" },
    });
  typia.assert(searchByTypeMySQL);
  for (const dataSource of searchByTypeMySQL.data) {
    TestValidator.equals("dataSource.type is mysql", dataSource.type, "mysql");
  }

  // 6. Search by is_active = true
  const searchByIsActive =
    await api.functional.flexOffice.admin.dataSources.index(connection, {
      body: { is_active: true },
    });
  typia.assert(searchByIsActive);
  for (const dataSource of searchByIsActive.data) {
    TestValidator.predicate(
      "dataSource is active",
      dataSource.is_active === true,
    );
  }

  // 7. Search by name partial match
  const partialName = createdDataSources[0].name.substring(0, 4);
  const searchByName = await api.functional.flexOffice.admin.dataSources.index(
    connection,
    {
      body: { name: partialName },
    },
  );
  typia.assert(searchByName);
  for (const dataSource of searchByName.data) {
    TestValidator.predicate(
      "dataSource name includes partial name",
      dataSource.name.includes(partialName),
    );
  }

  // 8. Search with pagination: page 1, limit 2
  const searchWithPagination =
    await api.functional.flexOffice.admin.dataSources.index(connection, {
      body: { page: 1, limit: 2 },
    });
  typia.assert(searchWithPagination);
  TestValidator.equals(
    "pagination current page",
    searchWithPagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    searchWithPagination.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "data length <= limit",
    searchWithPagination.data.length <= 2,
  );

  // 9. Search with filters combined: type 'mysql' & is_active = false
  const searchCombined =
    await api.functional.flexOffice.admin.dataSources.index(connection, {
      body: { type: "mysql", is_active: false },
    });
  typia.assert(searchCombined);
  for (const dataSource of searchCombined.data) {
    TestValidator.equals("combined filter type", dataSource.type, "mysql");
    TestValidator.equals(
      "combined filter is_active",
      dataSource.is_active,
      false,
    );
  }

  // 10. Search for non-existing name (expect empty results)
  const searchNonExist =
    await api.functional.flexOffice.admin.dataSources.index(connection, {
      body: { name: "nonexistentname123456" },
    });
  typia.assert(searchNonExist);
  TestValidator.equals(
    "empty data for non-matching name",
    searchNonExist.data.length,
    0,
  );
}
