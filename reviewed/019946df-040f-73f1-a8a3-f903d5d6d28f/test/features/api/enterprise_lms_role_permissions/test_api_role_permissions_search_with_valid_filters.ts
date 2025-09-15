import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsRolePermissions } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsRolePermissions";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsRolePermissions } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsRolePermissions";

export async function test_api_role_permissions_search_with_valid_filters(
  connection: api.IConnection,
) {
  // 1. Join as system administrator with valid details
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const passwordHash = RandomGenerator.alphaNumeric(32);
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);
  const status = "active";

  const joinResponse: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        status,
      } satisfies IEnterpriseLmsSystemAdmin.ICreate,
    });
  typia.assert(joinResponse);

  // 2. Login as system administrator with same email and password
  const loginResponse: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email,
        password_hash: passwordHash,
      } satisfies IEnterpriseLmsSystemAdmin.ILogin,
    });
  typia.assert(loginResponse);

  // 3. Search Role Permissions with various filters

  // Define a helper to test search with a given filter body
  async function doSearchTest(
    filterBody: IEnterpriseLmsRolePermissions.IRequest,
  ) {
    const result: IPageIEnterpriseLmsRolePermissions.ISummary =
      await api.functional.enterpriseLms.systemAdmin.rolePermissions.index(
        connection,
        { body: filterBody },
      );
    typia.assert(result);

    // Validate pagination metadata
    const pagination = result.pagination;
    TestValidator.predicate(
      "pagination current page is non-negative",
      pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination limit is positive",
      pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination records and pages are non-negative",
      pagination.records >= 0 && pagination.pages >= 0,
    );

    // Validate each item matches filters
    result.data.forEach((item) => {
      typia.assert(item);

      if (
        filterBody.permission_key !== null &&
        filterBody.permission_key !== undefined
      ) {
        TestValidator.predicate(
          `item permission_key includes filter permission_key: ${filterBody.permission_key}`,
          item.permission_key.includes(filterBody.permission_key),
        );
      }
      // role_id does not exist in ISummary, skip presence check
      if (
        filterBody.is_allowed !== null &&
        filterBody.is_allowed !== undefined
      ) {
        TestValidator.equals(
          `item is_allowed matches filter`,
          item.is_allowed,
          filterBody.is_allowed,
        );
      }
      if (filterBody.search !== null && filterBody.search !== undefined) {
        TestValidator.predicate(
          "item description or permission_key includes search string",
          (item.description ?? "").includes(filterBody.search) ||
            item.permission_key.includes(filterBody.search),
        );
      }
    });
  }

  // 3-1. Test basic pagination
  await doSearchTest({
    page: 0,
    limit: 5,
  } satisfies IEnterpriseLmsRolePermissions.IRequest);

  // 3-2. Test with permission_key filter
  await doSearchTest({
    permission_key: "admin",
    page: 0,
    limit: 10,
  } satisfies IEnterpriseLmsRolePermissions.IRequest);

  // 3-3. Test with is_allowed true filter
  await doSearchTest({
    is_allowed: true,
    page: 0,
    limit: 10,
  } satisfies IEnterpriseLmsRolePermissions.IRequest);

  // 3-4. Test with orderBy and orderDirection
  await doSearchTest({
    orderBy: "permission_key",
    orderDirection: "asc",
    page: 0,
    limit: 10,
  } satisfies IEnterpriseLmsRolePermissions.IRequest);

  // 3-5. Test with search string
  await doSearchTest({
    search: "read",
    page: 0,
    limit: 10,
  } satisfies IEnterpriseLmsRolePermissions.IRequest);

  // 3-6. Test with filters that should result empty list
  const emptyResult: IPageIEnterpriseLmsRolePermissions.ISummary =
    await api.functional.enterpriseLms.systemAdmin.rolePermissions.index(
      connection,
      {
        body: {
          search: "nonexistentfilterterm",
          page: 0,
          limit: 5,
        } satisfies IEnterpriseLmsRolePermissions.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result data array size",
    emptyResult.data.length,
    0,
  );

  // 4. Test unauthorized access expect error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access is forbidden", async () => {
    await api.functional.enterpriseLms.systemAdmin.rolePermissions.index(
      unauthConn,
      {
        body: {
          page: 0,
          limit: 1,
        } satisfies IEnterpriseLmsRolePermissions.IRequest,
      },
    );
  });
}
