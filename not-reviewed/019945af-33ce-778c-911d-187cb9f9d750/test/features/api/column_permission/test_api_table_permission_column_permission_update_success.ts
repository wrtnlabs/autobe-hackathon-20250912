import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeColumnPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeColumnPermission";
import type { IFlexOfficePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePermission";
import type { IFlexOfficeTablePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTablePermission";

/**
 * This E2E test validates the update operation for a column permission in the
 * FlexOffice admin role.
 *
 * It simulates the full sequence:
 *
 * 1. Admin user joins (registers).
 * 2. Admin login.
 * 3. Permission creation.
 * 4. Table permission creation linked to the permission.
 * 5. Column permission creation under table permission.
 * 6. Column permission update with new column name.
 *
 * The test asserts that the updated column permission reflects the intended
 * changes, verifying both API response correctness and data integrity.
 *
 * This confirms the admin's ability to manage fine-grained column level
 * permissions with proper authorization.
 */
export async function test_api_table_permission_column_permission_update_success(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Abcd1234!";
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin login
  const auth: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(auth);

  // 3. Create permission
  const permissionKey = `perm_${RandomGenerator.alphaNumeric(8)}`;
  const permissionStatus = "active";
  const permission: IFlexOfficePermission =
    await api.functional.flexOffice.admin.permissions.create(connection, {
      body: {
        permission_key: permissionKey,
        status: permissionStatus,
      } satisfies IFlexOfficePermission.ICreate,
    });
  typia.assert(permission);
  TestValidator.equals(
    "created permission key matches",
    permission.permission_key,
    permissionKey,
  );
  TestValidator.equals(
    "created permission status matches",
    permission.status,
    permissionStatus,
  );

  // 4. Create table permission linked to permission
  const tableName = `table_${RandomGenerator.alphabets(5)}`;
  const tablePermission: IFlexOfficeTablePermission =
    await api.functional.flexOffice.admin.tablePermissions.createTablePermission(
      connection,
      {
        body: {
          permission_id: permission.id,
          table_name: tableName,
        } satisfies IFlexOfficeTablePermission.ICreate,
      },
    );
  typia.assert(tablePermission);
  TestValidator.equals(
    "created table permission permission_id matches",
    tablePermission.permission_id,
    permission.id,
  );
  TestValidator.equals(
    "created table permission table_name matches",
    tablePermission.table_name,
    tableName,
  );

  // 5. Create column permission under table permission
  const initialColumnName = `column_${RandomGenerator.alphaNumeric(6)}`;
  const columnPermission: IFlexOfficeColumnPermission =
    await api.functional.flexOffice.admin.tablePermissions.columnPermissions.createColumnPermission(
      connection,
      {
        tablePermissionId: tablePermission.id,
        body: {
          table_permission_id: tablePermission.id,
          column_name: initialColumnName,
        } satisfies IFlexOfficeColumnPermission.ICreate,
      },
    );
  typia.assert(columnPermission);
  TestValidator.equals(
    "created column permission table_permission_id matches",
    columnPermission.table_permission_id,
    tablePermission.id,
  );
  TestValidator.equals(
    "created column permission column_name matches",
    columnPermission.column_name,
    initialColumnName,
  );

  // 6. Update the column permission
  const updatedColumnName = initialColumnName + "_updated";
  const updatedColumnPermission: IFlexOfficeColumnPermission =
    await api.functional.flexOffice.admin.tablePermissions.columnPermissions.updateColumnPermission(
      connection,
      {
        tablePermissionId: tablePermission.id,
        columnPermissionId: columnPermission.id,
        body: {
          column_name: updatedColumnName,
        } satisfies IFlexOfficeColumnPermission.IUpdate,
      },
    );
  typia.assert(updatedColumnPermission);
  TestValidator.equals(
    "updated column permission id matches",
    updatedColumnPermission.id,
    columnPermission.id,
  );
  TestValidator.equals(
    "updated column permission table_permission_id matches",
    updatedColumnPermission.table_permission_id,
    tablePermission.id,
  );
  TestValidator.equals(
    "updated column permission column_name matches",
    updatedColumnPermission.column_name,
    updatedColumnName,
  );
}
