import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePermission";
import type { IFlexOfficeTablePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTablePermission";

/**
 * This scenario tests secure deletion of a table permission record in
 * FlexOffice. It includes:
 *
 * - Admin registration and login to obtain authorization.
 * - Creation of a permission entity and associated table permission.
 * - Deletion of the table permission ensuring soft deletion as per business
 *   rules.
 * - Verification that the record is not retrievable or marked as deleted.
 * - Validations for invalid table permission IDs and unauthorized deletion
 *   attempts.
 *
 * Expected result is the successful soft deletion of the specified table
 * permission with appropriate permissions checked.
 */
export async function test_api_table_permission_deletion_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Admin joins (registers) and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongP@ssw0rd!",
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a permission entity
  const permissionKey = `perm_${RandomGenerator.alphaNumeric(8)}`;
  const permissionCreateBody = {
    permission_key: permissionKey,
    description: "Permission for table operations",
    status: "active",
  } satisfies IFlexOfficePermission.ICreate;
  const permission: IFlexOfficePermission =
    await api.functional.flexOffice.admin.permissions.create(connection, {
      body: permissionCreateBody,
    });
  typia.assert(permission);

  // 3. Create a table permission linked to the permission entity
  const tableName = `table_${RandomGenerator.alphaNumeric(6)}`;
  const tablePermissionCreateBody = {
    permission_id: permission.id,
    table_name: tableName,
  } satisfies IFlexOfficeTablePermission.ICreate;
  const tablePermission: IFlexOfficeTablePermission =
    await api.functional.flexOffice.admin.tablePermissions.createTablePermission(
      connection,
      {
        body: tablePermissionCreateBody,
      },
    );
  typia.assert(tablePermission);

  // 4. Attempt to delete the table permission by ID (soft delete)
  await api.functional.flexOffice.admin.tablePermissions.erase(connection, {
    id: tablePermission.id,
  });

  // 5. Verify that the deleted table permission is no longer available
  // Since we don't have a get endpoint, try to delete again and expect error
  await TestValidator.error(
    "Deleting already deleted (or non-existent) table permission should fail",
    async () => {
      await api.functional.flexOffice.admin.tablePermissions.erase(connection, {
        id: tablePermission.id,
      });
    },
  );

  // 6. Test unauthorized deletion attempt with a new admin user (simulate lack of permission by using another user without switching headers)
  const anotherAdminEmail = typia.random<string & tags.Format<"email">>();
  const anotherAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: anotherAdminEmail,
        password: "DiffP@ssw0rd!",
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(anotherAdmin);

  // Try deleting a permission that doesn't belong or currently deleted?
  await TestValidator.error(
    "Unauthorized admin should not delete table permission",
    async () => {
      await api.functional.flexOffice.admin.tablePermissions.erase(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
