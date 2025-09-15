import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficePermission";

/**
 * Validates that the FlexOffice admin can search permissions using
 * filtering, sorting, and pagination.
 *
 * This test performs the full authentication cycle to obtain a valid admin
 * token. Then, it performs several searches with different request bodies
 * to test filtering by permission_key and status, with various pagination
 * parameters.
 *
 * It further validates that:
 *
 * - The permissions returned match the criteria (permission_key substring,
 *   status)
 * - Pagination metadata makes sense (total pages, records, current page etc.)
 * - Results are typed and valid using typia.assert
 * - Edge cases like empty results are handled gracefully
 */
export async function test_api_flexoffice_permission_search_with_filter_and_pagination(
  connection: api.IConnection,
) {
  // 1. Create admin user
  const adminCreateBody = {
    email: `test_admin_${RandomGenerator.alphaNumeric(6)}@flexoffice.com`,
    password: "TestPassword123!",
  } satisfies IFlexOfficeAdmin.ICreate;

  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(adminAuthorized);

  // 2. Login as admin user
  const loginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IFlexOfficeAdmin.ILogin;

  const loginAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: loginBody });
  typia.assert(loginAuthorized);

  // 3. Perform searches with filters

  // 3-1. Search with permission_key filter to match substring
  const searchByKeyBody = {
    permission_key: "read",
    page: 1,
    limit: 10,
    status: null,
  } satisfies IFlexOfficePermission.IRequest;

  const searchByKeyResult: IPageIFlexOfficePermission =
    await api.functional.flexOffice.admin.permissions.search(connection, {
      body: searchByKeyBody,
    });
  typia.assert(searchByKeyResult);

  // Validate permission_key contains "read" substring (case sensitive)
  for (const permission of searchByKeyResult.data) {
    TestValidator.predicate(
      `permission_key contains 'read' (${permission.permission_key})`,
      permission.permission_key.includes("read"),
    );
    TestValidator.equals(
      "permission status is string",
      typeof permission.status,
      "string",
    );
  }

  // Validate pagination fields
  TestValidator.predicate(
    "pagination current page >= 1",
    searchByKeyResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    searchByKeyResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    searchByKeyResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    searchByKeyResult.pagination.records >= 0,
  );

  // 3-2. Search with status filter = "active" to get only active permissions
  const searchActiveBody = {
    permission_key: null,
    status: "active",
    page: 1,
    limit: 20,
  } satisfies IFlexOfficePermission.IRequest;

  const searchActiveResult: IPageIFlexOfficePermission =
    await api.functional.flexOffice.admin.permissions.search(connection, {
      body: searchActiveBody,
    });
  typia.assert(searchActiveResult);

  for (const permission of searchActiveResult.data) {
    TestValidator.equals("status is active", permission.status, "active");
  }

  // 3-3. Pagination test - page 2 with limit 5
  const searchPage2Body = {
    permission_key: null,
    status: null,
    page: 2,
    limit: 5,
  } satisfies IFlexOfficePermission.IRequest;

  const searchPage2Result: IPageIFlexOfficePermission =
    await api.functional.flexOffice.admin.permissions.search(connection, {
      body: searchPage2Body,
    });
  typia.assert(searchPage2Result);

  TestValidator.equals(
    "pagination current page is page 2",
    searchPage2Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is 5",
    searchPage2Result.pagination.limit,
    5,
  );

  // 3-4. Search with no results - filter by non-existent permission_key
  const searchNoResultBody = {
    permission_key: "nonexistent_permission_key_xyz",
    status: null,
    page: 1,
    limit: 10,
  } satisfies IFlexOfficePermission.IRequest;

  const searchNoResult: IPageIFlexOfficePermission =
    await api.functional.flexOffice.admin.permissions.search(connection, {
      body: searchNoResultBody,
    });
  typia.assert(searchNoResult);
  TestValidator.equals("no results returned", searchNoResult.data.length, 0);
  TestValidator.predicate(
    "pagination current page is 1",
    searchNoResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    searchNoResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages is 0",
    searchNoResult.pagination.pages === 0,
  );
  TestValidator.predicate(
    "pagination records is 0",
    searchNoResult.pagination.records === 0,
  );
}
