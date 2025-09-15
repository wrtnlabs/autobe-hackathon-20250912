import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import type { IEnterpriseLmsRolePermissions } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsRolePermissions";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEnterpriseLmsRolePermissions } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsRolePermissions";

/**
 * Validates the department manager's role permissions search functionality.
 *
 * This test performs the full workflow of registering a department manager
 * user, authenticating, searching for role permissions filtered by role ID,
 * and verifying that the results and pagination metadata conform to
 * expectations.
 *
 * It also tests that unauthorized access is rejected.
 *
 * Steps:
 *
 * 1. Department manager registration using a random email and names.
 * 2. Department manager login with the registered credentials.
 * 3. Perform a filtered role permissions search with pagination.
 * 4. Verify pagination metadata correctness and that data is an array.
 * 5. Check unauthorized access results in error.
 */
export async function test_api_role_permissions_search_with_department_manager_credentials(
  connection: api.IConnection,
) {
  // 1. Department Manager Registration
  const departmentManagerCreate = {
    email: typia.random<string>(),
    password: "StrongPassword123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsDepartmentManager.ICreate;

  const authorized: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: departmentManagerCreate,
    });
  typia.assert(authorized);

  // 2. Department Manager Login
  const departmentManagerLogin = {
    email: departmentManagerCreate.email,
    password: departmentManagerCreate.password,
  } satisfies IEnterpriseLmsDepartmentManager.ILogin;

  const loggedIn: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.login(connection, {
      body: departmentManagerLogin,
    });
  typia.assert(loggedIn);

  // 3. Role Permissions Search with Filter and Pagination
  const roleId = typia.random<string & tags.Format<"uuid">>();

  const requestBody = {
    page: 1,
    limit: 10,
    role_id: roleId,
    orderBy: "permission_key",
    orderDirection: "asc",
  } satisfies IEnterpriseLmsRolePermissions.IRequest;

  const response: IPageIEnterpriseLmsRolePermissions.ISummary =
    await api.functional.enterpriseLms.departmentManager.rolePermissions.index(
      connection,
      { body: requestBody },
    );
  typia.assert(response);

  // 4. Validate pagination metadata and data integrity
  TestValidator.predicate(
    "pagination current page is correct",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is respected",
    response.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is consistent",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate("data is array", Array.isArray(response.data));

  // 5. Unauthorized access validation
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthorized access is denied", async () => {
    await api.functional.enterpriseLms.departmentManager.rolePermissions.index(
      unauthorizedConnection,
      { body: requestBody },
    );
  });
}
