import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeRowPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeRowPermission";
import type { IFlexOfficeTablePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTablePermission";

/**
 * Test the creation of a row-level permission under a parent table
 * permission within FlexOffice.
 *
 * This test verifies the entire creation flow by an authorized admin user:
 *
 * 1. Admin user signs up and authentication tokens are checked.
 * 2. Admin user logs in successfully.
 * 3. A table permission is created as parent record.
 * 4. A row permission is created associated with the above table permission,
 *    including a valid filter condition.
 * 5. The test asserts that the returned row permission data is correct and
 *    structured, with proper associations and timestamps.
 *
 * This ensures access control enforcement at the row level and validates
 * proper linkage between entities.
 *
 * The test uses realistic randomly generated data according to schema
 * constraints and proper API function usage with awaited calls and type
 * safety validation.
 */
export async function test_api_table_permissions_row_permissions_creation_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Admin user creation and authorization token verification
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "P@ssw0rd123";
  const adminCreateBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ICreate;
  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin user login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ILogin;
  const adminLoginAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 3. Create a table permission
  const permissionId: string = typia.random<string & tags.Format<"uuid">>();
  const tableName = RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase();
  const tablePermissionCreateBody = {
    permission_id: permissionId,
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

  // 4. Create a row permission under the above table permission
  const filterCondition = `"user_id" = '${typia.random<string & tags.Format<"uuid">>()}'`;
  const rowPermissionCreateBody = {
    table_permission_id: tablePermission.id,
    filter_condition: filterCondition,
  } satisfies IFlexOfficeRowPermission.ICreate;
  const rowPermission: IFlexOfficeRowPermission =
    await api.functional.flexOffice.admin.tablePermissions.rowPermissions.create(
      connection,
      {
        tablePermissionId: tablePermission.id,
        body: rowPermissionCreateBody,
      },
    );
  typia.assert(rowPermission);

  // 5. Validate returned row permission details
  TestValidator.equals(
    "row permission linked to correct table permission",
    rowPermission.table_permission_id,
    tablePermission.id,
  );
  TestValidator.predicate(
    "valid uuid format for row permission id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      rowPermission.id,
    ),
  );
  TestValidator.equals(
    "row permission filter condition set correctly",
    rowPermission.filter_condition,
    filterCondition,
  );
  TestValidator.predicate(
    "valid created_at timestamp format",
    typeof rowPermission.created_at === "string" &&
      rowPermission.created_at.length > 10,
  );
  TestValidator.predicate(
    "valid updated_at timestamp format",
    typeof rowPermission.updated_at === "string" &&
      rowPermission.updated_at.length > 10,
  );

  // deleted_at is nullable - test as either null or undefined
  if (
    rowPermission.deleted_at !== null &&
    rowPermission.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deleted_at is valid date string when present",
      typeof rowPermission.deleted_at === "string" &&
        rowPermission.deleted_at.length > 10,
    );
  }
}
