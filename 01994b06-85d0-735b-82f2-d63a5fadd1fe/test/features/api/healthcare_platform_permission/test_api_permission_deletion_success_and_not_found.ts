import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPermission";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test the deletion of a permission by system admin: ensures successful
 * deletion of an existing permission, attempts duplicate and not-found
 * deletion, checks for forbidden access without admin role, and verifies system
 * stability after deletion.
 *
 * 1. Register a system admin account and authenticate
 * 2. Create a new permission
 * 3. Delete that permission using the correct permissionId
 * 4. Attempt to delete the same permission again (should fail), and try with a
 *    random non-existent UUID (should fail)
 * 5. Attempt permission deletion with unauthenticated connection (should fail)
 * 6. After deletion, create another permission to ensure the system is still
 *    functional
 */
export async function test_api_permission_deletion_success_and_not_found(
  connection: api.IConnection,
) {
  // 1. Register/join as system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminJoinInput = {
    email: sysAdminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: sysAdminEmail,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const adminAuth: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: sysAdminJoinInput,
    });
  typia.assert(adminAuth);

  // 2. Create a permission for deletion scenario
  const permissionReq = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    scope_type: "platform",
    status: "active",
  } satisfies IHealthcarePlatformPermission.ICreate;
  const permission: IHealthcarePlatformPermission =
    await api.functional.healthcarePlatform.systemAdmin.permissions.create(
      connection,
      { body: permissionReq },
    );
  typia.assert(permission);

  // 3. Delete the created permission
  await api.functional.healthcarePlatform.systemAdmin.permissions.erase(
    connection,
    { permissionId: permission.id },
  );

  // 4. Ensure repeated deletion or deletion of random uuid fails (not found)
  await TestValidator.error(
    "repeated deletion should fail for previously deleted permissionId",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.permissions.erase(
        connection,
        { permissionId: permission.id },
      );
    },
  );

  // Deletion with a random UUID
  await TestValidator.error(
    "deletion with random nonexistent permissionId should fail",
    async () => {
      const randomId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.healthcarePlatform.systemAdmin.permissions.erase(
        connection,
        { permissionId: randomId },
      );
    },
  );

  // 5. Attempt permission deletion without system admin authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "permission deletion should be forbidden for unauthenticated user",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.permissions.erase(
        unauthConn,
        { permissionId: permission.id },
      );
    },
  );

  // 6. After deletion, verify system still operates by creating another permission
  const permissionReq2 = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    scope_type: "platform",
    status: "active",
  } satisfies IHealthcarePlatformPermission.ICreate;
  const permission2: IHealthcarePlatformPermission =
    await api.functional.healthcarePlatform.systemAdmin.permissions.create(
      connection,
      { body: permissionReq2 },
    );
  typia.assert(permission2);
}
