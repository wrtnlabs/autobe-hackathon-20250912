import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePermission";
import type { IFlexOfficeTablePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTablePermission";

export async function test_api_table_permission_update_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Admin user creation and authentication
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword = `Pwd${RandomGenerator.alphaNumeric(8)}`;
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new permission entity
  const permissionKey = `perm_${RandomGenerator.alphaNumeric(6)}`;
  const permissionCreateBody = {
    permission_key: permissionKey,
    description: "Permission for testing table permission update",
    status: "active",
  } satisfies IFlexOfficePermission.ICreate;
  const permission: IFlexOfficePermission =
    await api.functional.flexOffice.admin.permissions.create(connection, {
      body: permissionCreateBody,
    });
  typia.assert(permission);

  // 3. Create an initial table permission
  const initialTableName = `table_${RandomGenerator.alphaNumeric(8)}`;
  const tablePermissionCreateBody = {
    permission_id: permission.id,
    table_name: initialTableName,
  } satisfies IFlexOfficeTablePermission.ICreate;
  const tablePermission: IFlexOfficeTablePermission =
    await api.functional.flexOffice.admin.tablePermissions.createTablePermission(
      connection,
      {
        body: tablePermissionCreateBody,
      },
    );
  typia.assert(tablePermission);

  // 4. Update the table permission - change to a new permission and new table name
  // Create a second permission for update target
  const permissionKey2 = `perm_${RandomGenerator.alphaNumeric(6)}`;
  const permission2Body = {
    permission_key: permissionKey2,
    description: "Second permission for update target",
    status: "active",
  } satisfies IFlexOfficePermission.ICreate;
  const permission2: IFlexOfficePermission =
    await api.functional.flexOffice.admin.permissions.create(connection, {
      body: permission2Body,
    });
  typia.assert(permission2);

  // New table name for update
  const updatedTableName = `table_${RandomGenerator.alphaNumeric(8)}`;
  const tablePermissionUpdateBody = {
    permission_id: permission2.id,
    table_name: updatedTableName,
  } satisfies IFlexOfficeTablePermission.IUpdate;

  const updatedTablePermission: IFlexOfficeTablePermission =
    await api.functional.flexOffice.admin.tablePermissions.update(connection, {
      id: tablePermission.id,
      body: tablePermissionUpdateBody,
    });
  typia.assert(updatedTablePermission);

  TestValidator.equals(
    "updated permission_id",
    updatedTablePermission.permission_id,
    permission2.id,
  );
  TestValidator.equals(
    "updated table_name",
    updatedTablePermission.table_name,
    updatedTableName,
  );

  // 5. Test error handling with invalid permission_id update: expect error
  await TestValidator.error(
    "update with non-existent permission_id should fail",
    async () => {
      await api.functional.flexOffice.admin.tablePermissions.update(
        connection,
        {
          id: tablePermission.id,
          body: {
            permission_id: typia.random<string & tags.Format<"uuid">>(), // Non-existent UUID
          } satisfies IFlexOfficeTablePermission.IUpdate,
        },
      );
    },
  );

  // 6. Test error handling with invalid table permission id: expect error
  await TestValidator.error(
    "update non-existent table permission id should fail",
    async () => {
      await api.functional.flexOffice.admin.tablePermissions.update(
        connection,
        {
          id: typia.random<string & tags.Format<"uuid">>(), // Non-existent table permission id
          body: {
            table_name: `table_${RandomGenerator.alphaNumeric(8)}`,
          } satisfies IFlexOfficeTablePermission.IUpdate,
        },
      );
    },
  );
}
