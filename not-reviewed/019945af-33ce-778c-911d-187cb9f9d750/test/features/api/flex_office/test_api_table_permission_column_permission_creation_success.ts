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
 * This end-to-end test verifies the successful creation of a column permission
 * associated with a table permission in the FlexOffice admin API.
 *
 * It covers the full business workflow:
 *
 * 1. Admin user registration via the join API.
 * 2. Admin user authentication via login.
 * 3. Creation of a permission entity with specific access rights.
 * 4. Creation of a table permission linking the permission to a specific database
 *    table.
 * 5. Creation of a column permission scoped to a column in that table.
 *
 * The test asserts that each response conforms to the expected DTO and that the
 * final column permission is correctly linked and contains the expected column
 * name.
 */
export async function test_api_table_permission_column_permission_creation_success(
  connection: api.IConnection,
) {
  // 1. Create admin user
  const adminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssword123!",
  } satisfies IFlexOfficeAdmin.ICreate;

  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreate,
    });
  typia.assert(admin);

  // 2. Admin login
  const loginBody = {
    email: adminCreate.email,
    password: adminCreate.password,
  } satisfies IFlexOfficeAdmin.ILogin;

  const loginResult: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResult);

  // 3. Create a permission
  const permissionCreate = {
    permission_key: "manage_column_access",
    description: "Allows managing column-level access permissions",
    status: "active",
  } satisfies IFlexOfficePermission.ICreate;

  const permission: IFlexOfficePermission =
    await api.functional.flexOffice.admin.permissions.create(connection, {
      body: permissionCreate,
    });
  typia.assert(permission);

  // 4. Create table permission linked to the permission
  const tablePermissionCreate = {
    permission_id: permission.id,
    table_name: "employees",
  } satisfies IFlexOfficeTablePermission.ICreate;

  const tablePermission: IFlexOfficeTablePermission =
    await api.functional.flexOffice.admin.tablePermissions.createTablePermission(
      connection,
      {
        body: tablePermissionCreate,
      },
    );
  typia.assert(tablePermission);

  // 5. Create column permission under the table permission
  const columnName = "salary";

  const columnPermissionCreate = {
    table_permission_id: tablePermission.id,
    column_name: columnName,
  } satisfies IFlexOfficeColumnPermission.ICreate;

  const columnPermission: IFlexOfficeColumnPermission =
    await api.functional.flexOffice.admin.tablePermissions.columnPermissions.createColumnPermission(
      connection,
      {
        tablePermissionId: tablePermission.id,
        body: columnPermissionCreate,
      },
    );
  typia.assert(columnPermission);

  // Validate the linkage and properties
  TestValidator.equals(
    "columnPermission.table_permission_id should match tablePermission.id",
    columnPermission.table_permission_id,
    tablePermission.id,
  );
  TestValidator.equals(
    "columnPermission.column_name should match requested name",
    columnPermission.column_name,
    columnName,
  );
}
