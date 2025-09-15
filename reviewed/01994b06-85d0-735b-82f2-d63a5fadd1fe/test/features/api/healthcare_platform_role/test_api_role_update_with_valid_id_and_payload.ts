import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRole";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate update of RBAC role by system admin (full workflow).
 *
 * 1. Register new system admin (join)
 * 2. Login as the admin
 * 3. Create a new role (ICreate)
 * 4. Update role (IUpdate) fields that are editable, check values
 * 5. Validate that non-editable fields (code/scope_type) are unchanged
 * 6. Attempt error: update using invalid roleId (random uuid)
 * 7. Attempt error: update with forbidden field (code/scope_type)
 * 8. Attempt error: update a non-existent roleId (random uuid)
 */
export async function test_api_role_update_with_valid_id_and_payload(
  connection: api.IConnection,
) {
  // Step 1: Register superuser admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(sysAdmin);

  // Step 2: Login as system admin
  const loginBody = {
    email: joinBody.email,
    provider: joinBody.provider,
    provider_key: joinBody.provider_key,
    password: joinBody.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const loginResult = await api.functional.auth.systemAdmin.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResult);

  // Step 3: Create a new role
  const roleCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    scope_type: RandomGenerator.pick([
      "platform",
      "organization",
      "department",
    ] as const),
    status: RandomGenerator.pick(["active", "archived", "retired"] as const),
  } satisfies IHealthcarePlatformRole.ICreate;
  const createdRole =
    await api.functional.healthcarePlatform.systemAdmin.roles.create(
      connection,
      { body: roleCreateBody },
    );
  typia.assert(createdRole);
  TestValidator.equals(
    "role name matches",
    createdRole.name,
    roleCreateBody.name,
  );
  TestValidator.equals(
    "role scope_type matches",
    createdRole.scope_type,
    roleCreateBody.scope_type,
  );
  TestValidator.equals(
    "role code matches",
    createdRole.code,
    roleCreateBody.code,
  );
  TestValidator.equals(
    "role status matches",
    createdRole.status,
    roleCreateBody.status,
  );

  // Step 4: Update role with valid payload
  const updateBody = {
    name: RandomGenerator.name(),
    status: RandomGenerator.pick(["active", "archived", "retired"] as const),
  } satisfies IHealthcarePlatformRole.IUpdate;
  const updatedRole =
    await api.functional.healthcarePlatform.systemAdmin.roles.update(
      connection,
      {
        roleId: createdRole.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRole);
  TestValidator.equals("role id unchanged", updatedRole.id, createdRole.id);
  TestValidator.notEquals(
    "role updated_at changed",
    updatedRole.updated_at,
    createdRole.updated_at,
  );
  TestValidator.equals(
    "role code unchanged",
    updatedRole.code,
    createdRole.code,
  );
  TestValidator.equals(
    "role scope_type unchanged",
    updatedRole.scope_type,
    createdRole.scope_type,
  );
  TestValidator.equals("updated name", updatedRole.name, updateBody.name);
  TestValidator.equals("updated status", updatedRole.status, updateBody.status);

  // Step 5a: Error - Update with invalid roleId
  await TestValidator.error("update with invalid roleId fails", async () => {
    await api.functional.healthcarePlatform.systemAdmin.roles.update(
      connection,
      {
        roleId: typia.random<string & tags.Format<"uuid">>(),
        body: updateBody,
      },
    );
  });

  // Step 5b: Error - Update with forbidden field (attempt to update code)
  // Type system does not allow non-defined fields; but try with object spread (should be rejected at compile)
  // We SKIP IMPLEMENTATION - cannot add code/scope_type to IUpdate!

  // Step 5c: Error - Update with non-existent roleId
  await TestValidator.error(
    "update with non-existent roleId fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.roles.update(
        connection,
        {
          roleId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );
}
