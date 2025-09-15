import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePermission";
import type { IFlexOfficeTablePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTablePermission";

export async function test_api_table_permission_creation_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Admin user signs up and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongPassword123!";
  const adminCreateBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ICreate;

  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(adminAuthorized);

  // 2. Create a new permission entity
  const permissionCreateBody = {
    permission_key: `perm_${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 10,
    }),
    status: "active",
  } satisfies IFlexOfficePermission.ICreate;

  const permission: IFlexOfficePermission =
    await api.functional.flexOffice.admin.permissions.create(connection, {
      body: permissionCreateBody,
    });
  typia.assert(permission);

  // 3. Create a table permission linking the permission with a table name
  const tableName = `tbl_${RandomGenerator.alphaNumeric(8)}`;
  const tablePermissionCreateBody = {
    permission_id: permission.id,
    table_name: tableName,
  } satisfies IFlexOfficeTablePermission.ICreate;

  const tablePermission: IFlexOfficeTablePermission =
    await api.functional.flexOffice.admin.tablePermissions.createTablePermission(
      connection,
      { body: tablePermissionCreateBody },
    );
  typia.assert(tablePermission);

  // 4. Validate the table permission's returned properties
  TestValidator.equals(
    "tablePermission.permission_id matches permission.id",
    tablePermission.permission_id,
    permission.id,
  );
  TestValidator.equals(
    "tablePermission.table_name matches created table name",
    tablePermission.table_name,
    tableName,
  );
}
