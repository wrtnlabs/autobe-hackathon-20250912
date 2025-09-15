import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPermission";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test retrieving a specific permission configuration as a system
 * administrator. Covers success, not found, and auth required.
 *
 * 1. Register and login as a system admin (system superuser).
 * 2. Create a new permission entry and obtain its UUID.
 * 3. Retrieve the permission by ID (success case), validate response structure and
 *    key fields.
 * 4. Retrieve by non-existent bogus UUID (negative: not found).
 * 5. Attempt access without authentication (simulate unauthenticated user),
 *    expecting rejection.
 */
export async function test_api_permission_retrieval_success_and_not_found(
  connection: api.IConnection,
) {
  // 1. Register system admin and login.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: RandomGenerator.alphabets(10),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;

  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, { body: joinBody });
  typia.assert(admin);
  TestValidator.equals("email matches", admin.email, joinBody.email);

  // 2. Create a permission
  const createBody = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
    scope_type: "platform",
    status: "active",
  } satisfies IHealthcarePlatformPermission.ICreate;

  const perm: IHealthcarePlatformPermission =
    await api.functional.healthcarePlatform.systemAdmin.permissions.create(
      connection,
      { body: createBody },
    );
  typia.assert(perm);
  TestValidator.equals("code matches", perm.code, createBody.code);
  TestValidator.equals("name matches", perm.name, createBody.name);
  TestValidator.equals(
    "description matches",
    perm.description,
    createBody.description,
  );
  TestValidator.equals(
    "scope_type matches",
    perm.scope_type,
    createBody.scope_type,
  );
  TestValidator.equals("status matches", perm.status, createBody.status);

  // 3. Retrieve by ID (success)
  const fetched: IHealthcarePlatformPermission =
    await api.functional.healthcarePlatform.systemAdmin.permissions.at(
      connection,
      { permissionId: perm.id },
    );
  typia.assert(fetched);
  TestValidator.equals(
    "fetched permission equals created",
    fetched,
    perm,
    (key) => key === "created_at" || key === "updated_at",
  );

  // 4. Fetch non-existent ID (should error)
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("not found for bogus id", async () => {
    await api.functional.healthcarePlatform.systemAdmin.permissions.at(
      connection,
      { permissionId: fakeId },
    );
  });

  // 5. Unauthenticated fetch attempt should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated request fails", async () => {
    await api.functional.healthcarePlatform.systemAdmin.permissions.at(
      unauthConn,
      { permissionId: perm.id },
    );
  });
}
