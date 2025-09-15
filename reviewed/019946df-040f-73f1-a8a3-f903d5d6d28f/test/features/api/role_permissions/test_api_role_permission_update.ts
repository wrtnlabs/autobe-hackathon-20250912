import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsRolePermission";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * Test updating an existing role permission by a system administrator.
 *
 * The test first creates and authenticates a system administrator user who
 * has rights to update role permissions.
 *
 * Then selects an existing or generated UUID to represent the role
 * permission ID to update.
 *
 * Constructs an update payload including permission_key, is_allowed, and
 * optionally description.
 *
 * Calls the update API endpoint to update the role permission and asserts
 * that the returned object matches the expected updated values, including
 * the same ID.
 *
 * Uses typia and RandomGenerator to generate valid UUIDs and strings, and
 * asserts response types with typia.assert.
 *
 * The test ensures connection authentication tokens are correctly used by
 * calling the join and login endpoints before the update.
 */
export async function test_api_role_permission_update(
  connection: api.IConnection,
) {
  // 1. Create a new system administrator user via join
  const adminCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const adminUser: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminUser);

  // 2. Login with the created system administrator user
  const loginBody = {
    email: adminCreateBody.email,
    password_hash: adminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;
  const loginUser: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(loginUser);

  // 3. Generate a role permission ID to update
  const rolePermissionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Prepare update body
  const updateBody = {
    permission_key: RandomGenerator.name(),
    is_allowed: true,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IEnterpriseLmsRolePermission.IUpdate;

  // 5. Call update API
  const updatedRolePermission: IEnterpriseLmsRolePermission =
    await api.functional.enterpriseLms.systemAdmin.rolePermissions.update(
      connection,
      { id: rolePermissionId, body: updateBody },
    );
  typia.assert(updatedRolePermission);

  // 6. Assert updated values
  TestValidator.equals(
    "updated role permission id",
    updatedRolePermission.id,
    rolePermissionId,
  );
  TestValidator.equals(
    "updated role permission key",
    updatedRolePermission.permission_key,
    updateBody.permission_key,
  );
  TestValidator.equals(
    "updated is_allowed flag",
    updatedRolePermission.is_allowed,
    updateBody.is_allowed,
  );
  TestValidator.equals(
    "updated description",
    updatedRolePermission.description,
    updateBody.description,
  );
}
