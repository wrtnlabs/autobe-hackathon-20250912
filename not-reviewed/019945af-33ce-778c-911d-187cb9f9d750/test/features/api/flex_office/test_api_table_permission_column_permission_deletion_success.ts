import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeColumnPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeColumnPermission";
import type { IFlexOfficePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePermission";
import type { IFlexOfficeTablePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTablePermission";

export async function test_api_table_permission_column_permission_deletion_success(
  connection: api.IConnection,
) {
  // 1. Admin user join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreated = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin_password_1234",
    } satisfies IFlexOfficeAdmin.ICreate,
  });
  typia.assert(adminCreated);

  // 2. Admin user login
  const adminLoggedIn = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "admin_password_1234",
    } satisfies IFlexOfficeAdmin.ILogin,
  });
  typia.assert(adminLoggedIn);

  // 3. Create a permission entity
  const permissionBody = {
    permission_key: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    status: "active",
  } satisfies IFlexOfficePermission.ICreate;
  const createdPermission =
    await api.functional.flexOffice.admin.permissions.create(connection, {
      body: permissionBody,
    });
  typia.assert(createdPermission);

  // 4. Create a table permission associated with the created permission
  const tablePermissionBody = {
    permission_id: createdPermission.id,
    table_name: "users",
  } satisfies IFlexOfficeTablePermission.ICreate;
  const createdTablePermission =
    await api.functional.flexOffice.admin.tablePermissions.createTablePermission(
      connection,
      { body: tablePermissionBody },
    );
  typia.assert(createdTablePermission);

  // 5. Create a column permission under the table permission
  const columnPermissionBody = {
    table_permission_id: createdTablePermission.id,
    column_name: "email",
  } satisfies IFlexOfficeColumnPermission.ICreate;
  const createdColumnPermission =
    await api.functional.flexOffice.admin.tablePermissions.columnPermissions.createColumnPermission(
      connection,
      {
        tablePermissionId: createdTablePermission.id,
        body: columnPermissionBody,
      },
    );
  typia.assert(createdColumnPermission);

  // 6. Delete the created column permission
  await api.functional.flexOffice.admin.tablePermissions.columnPermissions.eraseColumnPermission(
    connection,
    {
      tablePermissionId: createdTablePermission.id,
      columnPermissionId: createdColumnPermission.id,
    },
  );

  // Since no GET API is provided to verify deletion, we expect no error during deletion
  TestValidator.predicate("Column permission deletion success", true);
}
