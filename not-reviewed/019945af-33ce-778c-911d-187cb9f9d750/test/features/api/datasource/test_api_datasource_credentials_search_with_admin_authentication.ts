import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IFlexOfficeDataSourceCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceCredential";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeDataSourceCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeDataSourceCredential";

/**
 * This E2E test validates the search functionality for data source credentials
 * with admin authentication.
 *
 * The test performs the following workflow:
 *
 * 1. Register and login a new admin user via POST /auth/admin/join.
 * 2. Create a data source with valid parameters via POST
 *    /flexOffice/admin/dataSources.
 * 3. Conduct a credentials search for the created data source using PATCH
 *    /flexOffice/admin/dataSources/{dataSourceId}/credentials with various
 *    filters and paging.
 * 4. Validate that the search results match the search criteria and pagination
 *    metadata is correct.
 * 5. Attempt to search credentials with a non-existent dataSourceId to verify
 *    error handling.
 * 6. Attempt to search credentials without admin authorization to verify
 *    authorization enforcement.
 *
 * At every step, typia.assert ensures response types match the expected DTOs.
 * TestValidator functions assert business rules.
 */
export async function test_api_datasource_credentials_search_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Admin user registration and authentication
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword = "ValidPass123";

  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin creates a data source
  const dataSourceName = `DataSource-${RandomGenerator.alphaNumeric(6)}`; // unique name
  const dataSourceType = RandomGenerator.pick([
    "mysql",
    "postgresql",
    "google_sheet",
    "excel",
  ] as const);
  const dataSourceConnectionInfo = JSON.stringify({
    host: "localhost",
    port: 5432,
    database: "testdb",
    user: "admin",
    password: "secret",
  });

  const dataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.admin.dataSources.create(connection, {
      body: {
        name: dataSourceName,
        type: dataSourceType,
        connection_info: dataSourceConnectionInfo,
        is_active: true,
      } satisfies IFlexOfficeDataSource.ICreate,
    });
  typia.assert(dataSource);

  // 3. Search credentials for the created data source with various filters and pagination

  // Define search request bodies
  const emptyFilterBody = {} satisfies IFlexOfficeDataSourceCredential.IRequest;

  const filterByTypeBody = {
    filter: `credential_type == "API_KEY"`,
  } satisfies IFlexOfficeDataSourceCredential.IRequest;

  const pagedRequestBody = {
    page: 1,
    limit: 5,
    sort_by: "created_at",
    order: "desc",
  } satisfies IFlexOfficeDataSourceCredential.IRequest;

  // Search credentials with empty filter
  const credentialsEmpty: IPageIFlexOfficeDataSourceCredential.ISummary =
    await api.functional.flexOffice.admin.dataSources.credentials.index(
      connection,
      {
        dataSourceId: typia.assert<string & tags.Format<"uuid">>(dataSource.id),
        body: emptyFilterBody,
      },
    );
  typia.assert(credentialsEmpty);

  // Validate pagination information
  TestValidator.predicate(
    "pagination current >= 0",
    credentialsEmpty.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    credentialsEmpty.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    credentialsEmpty.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    credentialsEmpty.pagination.records >= 0,
  );

  // Search credentials filtered by credential_type "API_KEY"
  const credentialsFiltered: IPageIFlexOfficeDataSourceCredential.ISummary =
    await api.functional.flexOffice.admin.dataSources.credentials.index(
      connection,
      {
        dataSourceId: dataSource.id,
        body: filterByTypeBody,
      },
    );
  typia.assert(credentialsFiltered);

  // If filtered data is present, ensure all returned credentials have requested credential_type
  if (credentialsFiltered.data.length > 0) {
    credentialsFiltered.data.forEach((cred) => {
      TestValidator.equals(
        "credential_type is API_KEY",
        cred.credential_type,
        "API_KEY",
      );
    });
  }

  // Search credentials with pagination
  const credentialsPaged: IPageIFlexOfficeDataSourceCredential.ISummary =
    await api.functional.flexOffice.admin.dataSources.credentials.index(
      connection,
      {
        dataSourceId: dataSource.id,
        body: pagedRequestBody,
      },
    );
  typia.assert(credentialsPaged);

  TestValidator.equals(
    "pagination limit is 5",
    credentialsPaged.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination current page is 1",
    credentialsPaged.pagination.current,
    1,
  );

  // 4. Attempt search with non-existent dataSourceId - expect error
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "search with non-existent dataSourceId should fail",
    async () => {
      await api.functional.flexOffice.admin.dataSources.credentials.index(
        connection,
        {
          dataSourceId: nonExistentId,
          body: emptyFilterBody,
        },
      );
    },
  );

  // 5. Attempt search with insufficient authorization
  // Prepare unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "search credentials without admin authorization should fail",
    async () => {
      await api.functional.flexOffice.admin.dataSources.credentials.index(
        unauthConn,
        {
          dataSourceId: dataSource.id,
          body: emptyFilterBody,
        },
      );
    },
  );
}
