import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsRolePermission";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * Test creating a role permission by a system administrator in the
 * Enterprise LMS system.
 *
 * This test covers the full workflow:
 *
 * 1. System administrator joins (registers) with required credentials.
 * 2. The system administrator logs in to obtain authorization tokens.
 * 3. Creates a role permission with realistic, valid data including role ID,
 *    permission key, description, and is_allowed flag.
 * 4. Validates the created role permission response matches input.
 * 5. Negative test ensures duplicate role permission creation is rejected.
 *
 * This ensures role permission creation respects business logic and
 * authorization enforcement. The test covers success and common failure
 * scenarios with type-safe, validated calls.
 */
export async function test_api_role_permission_creation(
  connection: api.IConnection,
) {
  // 1. SystemAdmin join to create a system administrator account
  // Prepare system admin creation request body
  const systemAdminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: systemAdminCreateBody,
    });
  typia.assert(systemAdmin);

  // 2. SystemAdmin login with credentials
  const systemAdminLoginBody = {
    email: systemAdminCreateBody.email,
    password_hash: systemAdminCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const systemAdminLogin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: systemAdminLoginBody,
    });
  typia.assert(systemAdminLogin);

  // 3. Create a Role Permission with valid data
  const rolePermissionCreateBody = {
    // Using the role_id from system admin to simulate role association
    role_id: systemAdmin.id,
    permission_key: RandomGenerator.alphaNumeric(8),
    description: `Permission to ${RandomGenerator.name(2)}`,
    is_allowed: true,
  } satisfies IEnterpriseLmsRolePermission.ICreate;

  const rolePermission: IEnterpriseLmsRolePermission =
    await api.functional.enterpriseLms.systemAdmin.rolePermissions.create(
      connection,
      { body: rolePermissionCreateBody },
    );
  typia.assert(rolePermission);

  TestValidator.equals(
    "role permission role_id matches input",
    rolePermission.role_id,
    rolePermissionCreateBody.role_id,
  );
  TestValidator.equals(
    "role permission key matches input",
    rolePermission.permission_key,
    rolePermissionCreateBody.permission_key,
  );
  TestValidator.equals(
    "role permission is_allowed matches input",
    rolePermission.is_allowed,
    rolePermissionCreateBody.is_allowed,
  );

  // 4. Negative test: Creating duplicate role permission should fail
  await TestValidator.error(
    "creating duplicate role permission fails",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.rolePermissions.create(
        connection,
        {
          body: rolePermissionCreateBody,
        },
      );
    },
  );
}
