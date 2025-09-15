import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeTablePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTablePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeTablePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeTablePermission";

/**
 * E2E test validating the table permission search API with filtering and
 * pagination under admin authentication.
 *
 * This test covers the following:
 *
 * 1. Admin user creation via join endpoint with proper email and password.
 * 2. Admin login to acquire authentication tokens.
 * 3. Unauthorized access attempt to main search endpoint to confirm access
 *    control rejection.
 * 4. Authorized request to main endpoint with no filters to retrieve full
 *    paginated results.
 * 5. Authorized request with filtering by permission_id to get filtered
 *    results.
 * 6. Authorized request with filtering by table_name to get filtered results.
 * 7. Validation of pagination metadata on all paginated responses.
 * 8. Type safety validation using typia.assert on all API responses.
 */
export async function test_api_table_permission_search_with_filtering_and_pagination(
  connection: api.IConnection,
) {
  // 1. Admin user join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "SecurePass123!",
    } satisfies IFlexOfficeAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Admin login
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "SecurePass123!",
    } satisfies IFlexOfficeAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 3. Unauthorized request to main endpoint: create unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized request should be rejected",
    async () => {
      await api.functional.flexOffice.admin.tablePermissions.indexTablePermission(
        unauthenticatedConnection,
        { body: {} satisfies IFlexOfficeTablePermission.IRequest },
      );
    },
  );

  // 4. Request main endpoint with no filters (empty request body), default pagination
  const fullListResponse =
    await api.functional.flexOffice.admin.tablePermissions.indexTablePermission(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          permission_id: null,
          table_name: null,
        } satisfies IFlexOfficeTablePermission.IRequest,
      },
    );
  typia.assert(fullListResponse);

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is positive",
    fullListResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    fullListResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    fullListResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination number of pages is positive",
    fullListResponse.pagination.pages >= 1,
  );

  // 5. If fullListResponse.data is non-empty, pick one permission_id to filter
  let permissionIdToFilter: (string & tags.Format<"uuid">) | null = null;
  if (fullListResponse.data.length > 0) {
    permissionIdToFilter = fullListResponse.data[0].permission_id;

    // Query filtered by permission_id
    const filteredByPermissionId =
      await api.functional.flexOffice.admin.tablePermissions.indexTablePermission(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            permission_id: permissionIdToFilter,
            table_name: null,
          } satisfies IFlexOfficeTablePermission.IRequest,
        },
      );
    typia.assert(filteredByPermissionId);

    // Validate all returned data have matching permission_id
    for (const item of filteredByPermissionId.data) {
      TestValidator.equals(
        "permission_id matches filter",
        item.permission_id,
        permissionIdToFilter,
      );
    }

    // Validate pagination metadata similar to above
    TestValidator.predicate(
      "pagination current page is positive",
      filteredByPermissionId.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit is positive",
      filteredByPermissionId.pagination.limit >= 1,
    );
    TestValidator.predicate(
      "pagination records is non-negative",
      filteredByPermissionId.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination number of pages is positive",
      filteredByPermissionId.pagination.pages >= 1,
    );
  }

  // 6. If fullListResponse.data is non-empty, pick one table_name to filter
  let tableNameToFilter: string | null = null;
  if (fullListResponse.data.length > 0) {
    tableNameToFilter = fullListResponse.data[0].table_name;

    // Query filtered by table_name
    const filteredByTableName =
      await api.functional.flexOffice.admin.tablePermissions.indexTablePermission(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            permission_id: null,
            table_name: tableNameToFilter,
          } satisfies IFlexOfficeTablePermission.IRequest,
        },
      );
    typia.assert(filteredByTableName);

    // Validate all returned data have matching table_name
    for (const item of filteredByTableName.data) {
      TestValidator.equals(
        "table_name matches filter",
        item.table_name,
        tableNameToFilter,
      );
    }

    // Validate pagination metadata similar to above
    TestValidator.predicate(
      "pagination current page is positive",
      filteredByTableName.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit is positive",
      filteredByTableName.pagination.limit >= 1,
    );
    TestValidator.predicate(
      "pagination records is non-negative",
      filteredByTableName.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination number of pages is positive",
      filteredByTableName.pagination.pages >= 1,
    );
  }
}
