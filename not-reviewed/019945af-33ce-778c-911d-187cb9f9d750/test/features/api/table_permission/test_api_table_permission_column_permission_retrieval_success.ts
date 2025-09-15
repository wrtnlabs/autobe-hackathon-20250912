import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeColumnPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeColumnPermission";
import type { IFlexOfficePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePermission";
import type { IFlexOfficeTablePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTablePermission";

export async function test_api_table_permission_column_permission_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Admin user join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "P@ssw0rd!",
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin login
  const login: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: "P@ssw0rd!",
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(login);

  // 3. Create permission
  const permissionKey = `perm_${RandomGenerator.alphaNumeric(6)}`;
  const permissionDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const permissionStatus = "active";
  const permission: IFlexOfficePermission =
    await api.functional.flexOffice.admin.permissions.create(connection, {
      body: {
        permission_key: permissionKey,
        description: permissionDescription,
        status: permissionStatus,
      } satisfies IFlexOfficePermission.ICreate,
    });
  typia.assert(permission);

  // 4. Create table permission
  const tableName = `table_${RandomGenerator.alphaNumeric(5)}`;
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

  // 5. Create column permission
  const columnName = `column_${RandomGenerator.alphaNumeric(4)}`;
  const columnPermission: IFlexOfficeColumnPermission =
    await api.functional.flexOffice.admin.tablePermissions.columnPermissions.createColumnPermission(
      connection,
      {
        tablePermissionId: tablePermission.id,
        body: {
          table_permission_id: tablePermission.id,
          column_name: columnName,
        } satisfies IFlexOfficeColumnPermission.ICreate,
      },
    );
  typia.assert(columnPermission);

  // 6. Retrieve the column permission
  const retrieved: IFlexOfficeColumnPermission =
    await api.functional.flexOffice.admin.tablePermissions.columnPermissions.at(
      connection,
      {
        tablePermissionId: tablePermission.id,
        columnPermissionId: columnPermission.id,
      },
    );
  typia.assert(retrieved);

  // Validation
  TestValidator.equals(
    "column permission id matches",
    retrieved.id,
    columnPermission.id,
  );
  TestValidator.equals(
    "table permission id matches",
    retrieved.table_permission_id,
    tablePermission.id,
  );
  TestValidator.equals(
    "column name matches",
    retrieved.column_name,
    columnName,
  );
  TestValidator.equals(
    "table permission association matches",
    retrieved.table_permission_id,
    tablePermission.id,
  );
}
