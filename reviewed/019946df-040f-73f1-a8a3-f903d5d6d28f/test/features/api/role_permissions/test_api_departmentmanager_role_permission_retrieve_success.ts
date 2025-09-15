import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import type { IEnterpriseLmsRolePermissions } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsRolePermissions";

export async function test_api_departmentmanager_role_permission_retrieve_success(
  connection: api.IConnection,
) {
  // 1. Register a new department manager user
  const createBody = {
    email: `test_${RandomGenerator.alphabets(5)}@example.com`,
    password: "Password123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsDepartmentManager.ICreate;

  const authorized: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // 2. Login as the department manager
  const loginBody = {
    email: createBody.email,
    password: createBody.password,
  } satisfies IEnterpriseLmsDepartmentManager.ILogin;

  const loginUser: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.login(connection, {
      body: loginBody,
    });
  typia.assert(loginUser);

  // 3. Retrieve a fake role permission ID (acting as a valid UUID)
  const rolePermissionId = typia.random<string & tags.Format<"uuid">>();

  const rolePermission: IEnterpriseLmsRolePermissions =
    await api.functional.enterpriseLms.departmentManager.rolePermissions.at(
      connection,
      { id: rolePermissionId },
    );
  typia.assert(rolePermission);

  // 4. Validate critical properties
  TestValidator.predicate(
    "role permission id is valid UUID",
    typeof rolePermission.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        rolePermission.id,
      ),
  );
  TestValidator.predicate(
    "role id is valid UUID",
    typeof rolePermission.role_id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        rolePermission.role_id,
      ),
  );
  TestValidator.predicate(
    "permission_key is a non-empty string",
    typeof rolePermission.permission_key === "string" &&
      rolePermission.permission_key.length > 0,
  );
  TestValidator.predicate(
    "is_allowed is boolean",
    typeof rolePermission.is_allowed === "boolean",
  );
  // description can be string, null or undefined. If string, check non-empty
  TestValidator.predicate(
    "description is string or null or undefined",
    rolePermission.description === null ||
      rolePermission.description === undefined ||
      (typeof rolePermission.description === "string" &&
        rolePermission.description.length > 0),
  );
}
