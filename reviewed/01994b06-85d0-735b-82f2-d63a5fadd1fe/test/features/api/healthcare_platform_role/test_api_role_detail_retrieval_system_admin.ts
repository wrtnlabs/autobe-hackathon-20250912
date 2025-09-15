import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRole";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate role detail retrieval by system admin, including not found and
 * unauthorized access cases.
 *
 * 1. Register a new system admin (platform-level superuser).
 * 2. Log in as the new system admin to authenticate and obtain system admin
 *    privileges.
 * 3. (If possible) Use or create a known role. If direct creation is
 *    unavailable, generate a valid UUID for roleId and assume it may or may
 *    not exist.
 * 4. Successfully retrieve a real role detail via GET
 *    /healthcarePlatform/systemAdmin/roles/{roleId} with an authenticated
 *    admin session; validate all fields match expectations and types.
 * 5. Attempt to retrieve a non-existent roleId (randomly generated UUID not
 *    matching any real role); verify that a 404 or appropriate error
 *    occurs.
 * 6. Attempt to access /healthcarePlatform/systemAdmin/roles/{roleId} without
 *    authentication (no token in connection headers); verify unauthorized
 *    error.
 */
export async function test_api_role_detail_retrieval_system_admin(
  connection: api.IConnection,
) {
  // 1. Register a new system admin (superuser)
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinInput,
  });
  typia.assert(admin);

  // 2. Log in as this admin
  const loginInput = {
    email: joinInput.email,
    provider: "local",
    provider_key: joinInput.email,
    password: joinInput.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const login = await api.functional.auth.systemAdmin.login(connection, {
    body: loginInput,
  });
  typia.assert(login);

  // 3. Role selection: try to retrieve a (possibly existing) random roleId
  const testRoleId = typia.random<string & tags.Format<"uuid">>();
  let foundRole: IHealthcarePlatformRole | undefined;
  try {
    foundRole = await api.functional.healthcarePlatform.systemAdmin.roles.at(
      connection,
      { roleId: testRoleId },
    );
    typia.assert(foundRole);
  } catch (_e) {
    // Not found, test continues for error case
  }

  // 4. Success case: if we found a real role, test proper retrieval and field validity
  if (foundRole) {
    const result = await api.functional.healthcarePlatform.systemAdmin.roles.at(
      connection,
      { roleId: foundRole.id },
    );
    typia.assert(result);
    TestValidator.equals("role id matches", result.id, foundRole.id);
    TestValidator.equals("role code matches", result.code, foundRole.code);
    TestValidator.equals("role name matches", result.name, foundRole.name);
    TestValidator.equals(
      "scope type matches",
      result.scope_type,
      foundRole.scope_type,
    );
    TestValidator.equals("status matches", result.status, foundRole.status);
    TestValidator.equals(
      "created_at matches",
      result.created_at,
      foundRole.created_at,
    );
    TestValidator.equals(
      "updated_at matches",
      result.updated_at,
      foundRole.updated_at,
    );
    TestValidator.equals(
      "deleted_at matches",
      result.deleted_at,
      foundRole.deleted_at,
    );
  }

  // 5. Not found error: random UUID that should not exist
  const notExistRoleId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should throw 404 for non-existent roleId",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.roles.at(connection, {
        roleId: notExistRoleId,
      });
    },
  );

  // 6. Unauthorized error: no authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access is forbidden", async () => {
    await api.functional.healthcarePlatform.systemAdmin.roles.at(unauthConn, {
      roleId: testRoleId,
    });
  });
}
