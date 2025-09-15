import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRole";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate system admin can permanently delete a role and gets proper error on
 * invalid roleId.
 *
 * Scenario:
 *
 * 1. Register admin as test superuser (unique business email, local provider,
 *    random password).
 * 2. Login as the admin.
 * 3. Create a new unique role (platform scope).
 * 4. Perform DELETE for /healthcarePlatform/systemAdmin/roles/{roleId} with the
 *    valid id (should succeed, returns void).
 * 5. Attempt DELETE with random UUID (non-existent roleId), expect business error.
 */
export async function test_api_role_deletion_with_valid_and_invalid_role_id(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const joinOutput = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(joinOutput);

  // 2. Login (should set session etc)
  const loginOutput = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(loginOutput);

  // 3. Create a unique RBAC role
  const roleCode = `test_${RandomGenerator.alphaNumeric(8)}`;
  const role = await api.functional.healthcarePlatform.systemAdmin.roles.create(
    connection,
    {
      body: {
        code: roleCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        scope_type: "platform",
        status: "active",
      } satisfies IHealthcarePlatformRole.ICreate,
    },
  );
  typia.assert(role);

  // 4. Delete the role (should succeed, returns void, cannot retrieve/verify further as no 'get' endpoint given)
  await api.functional.healthcarePlatform.systemAdmin.roles.erase(connection, {
    roleId: role.id,
  });
  // No direct assert possible as endpoint returns void; pass if no exception.

  // 5. Attempt to delete a non-existent roleId
  const bogusRoleId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should throw error for non-existent roleId on deletion",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.roles.erase(
        connection,
        {
          roleId: bogusRoleId,
        },
      );
    },
  );
}
