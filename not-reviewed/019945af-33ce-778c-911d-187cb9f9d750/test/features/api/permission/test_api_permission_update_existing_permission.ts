import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePermission";

/**
 * Validate update operation on an existing FlexOffice permission.
 *
 * This test validates updating an existing FlexOffice permission's properties
 * including key, description, and status. It starts with admin user creation
 * and login to ensure proper authorization context. The test covers success
 * cases of updating individual fields and the entire entity, as well as failure
 * scenarios for invalid IDs, duplicate permission keys, and unauthorized access
 * attempts.
 *
 * Steps:
 *
 * 1. Admin user joins and logs in to obtain authentication context.
 * 2. Initial creation of a permission entity is either assumed or randomly
 *    generated to update.
 * 3. Successful update with new permission_key, description, or status.
 * 4. Failure update on non-existent permission ID.
 * 5. Failure update with duplicate permission_key validation.
 * 6. Failure update attempt by non-admin or unauthorized users.
 * 7. Validation of response correctness using typia.assert.
 * 8. Validation that updates reflect properly by comparing before and after
 *    states.
 */
export async function test_api_permission_update_existing_permission(
  connection: api.IConnection,
) {
  // 1. Admin user joins
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin#1234";
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin user logs in
  const loggedInAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(loggedInAdmin);

  // Generate a random existing permission id
  const existingPermissionId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // Unique permission keys for testing
  const permissionKey1 = `perm_${RandomGenerator.alphaNumeric(6)}`;
  const permissionKey2 = `perm_${RandomGenerator.alphaNumeric(6)}`;

  // Update permission with permissionKey1 to simulate setup
  const updatedPermission1: IFlexOfficePermission =
    await api.functional.flexOffice.admin.permissions.update(connection, {
      id: existingPermissionId,
      body: {
        permission_key: permissionKey1,
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        status: "active",
      } satisfies IFlexOfficePermission.IUpdate,
    });
  typia.assert(updatedPermission1);
  TestValidator.equals(
    "permission_key updated to permissionKey1",
    updatedPermission1.permission_key,
    permissionKey1,
  );
  TestValidator.equals("status is active", updatedPermission1.status, "active");
  TestValidator.equals(
    "updated permission ID matches requested",
    updatedPermission1.id,
    existingPermissionId,
  );

  // 3. Successful update: change permission_key, description and status
  const newDescription = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const updatedPermission2: IFlexOfficePermission =
    await api.functional.flexOffice.admin.permissions.update(connection, {
      id: existingPermissionId,
      body: {
        permission_key: permissionKey2,
        description: newDescription,
        status: "disabled",
      } satisfies IFlexOfficePermission.IUpdate,
    });
  typia.assert(updatedPermission2);
  TestValidator.equals(
    "permission_key updated to permissionKey2",
    updatedPermission2.permission_key,
    permissionKey2,
  );
  TestValidator.equals(
    "description updated",
    updatedPermission2.description,
    newDescription,
  );
  TestValidator.equals(
    "status is disabled",
    updatedPermission2.status,
    "disabled",
  );
  TestValidator.equals(
    "updated permission ID matches requested",
    updatedPermission2.id,
    existingPermissionId,
  );

  // 4. Failure update: invalid permission id
  const invalidPermissionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update fails with invalid permission ID",
    async () => {
      await api.functional.flexOffice.admin.permissions.update(connection, {
        id: invalidPermissionId,
        body: {
          permission_key: `perm_${RandomGenerator.alphaNumeric(6)}`,
        } satisfies IFlexOfficePermission.IUpdate,
      });
    },
  );

  // 5. Failure update: duplicate permission_key
  // Attempt to update existingPermissionId to permissionKey1 which is already used
  await TestValidator.error(
    "update fails with duplicate permission_key",
    async () => {
      await api.functional.flexOffice.admin.permissions.update(connection, {
        id: existingPermissionId,
        body: {
          permission_key: permissionKey1,
        } satisfies IFlexOfficePermission.IUpdate,
      });
    },
  );

  // 6. Failure update: unauthorized user - simulate by using unauthenticated connection
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized update attempt fails", async () => {
    await api.functional.flexOffice.admin.permissions.update(unauthConnection, {
      id: existingPermissionId,
      body: {
        status: "active",
      } satisfies IFlexOfficePermission.IUpdate,
    });
  });
}
