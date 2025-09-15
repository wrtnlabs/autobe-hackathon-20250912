import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeRowPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeRowPermission";
import type { IFlexOfficeTablePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTablePermission";

/**
 * This E2E test verifies updating a row-level permission filter condition
 * within a specific table permission by an administrative user.
 *
 * Business context:
 *
 * - Ensures only admin users can update row permissions.
 * - Validates authentication flow for admin.
 * - Confirms successful create and update of permissions.
 * - Verifies response integrity and correctness of updated fields.
 *
 * Test steps:
 *
 * 1. Create a new admin user and authenticate.
 * 2. Login as the admin user.
 * 3. Create a table permission.
 * 4. Create a row permission under the table permission.
 * 5. Update the row permission filter condition.
 * 6. Validate responses and check that updates were applied correctly.
 */
export async function test_api_table_permissions_row_permissions_update_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Admin user registration and automatic authentication token handling
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "strong-password-123";
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin login to ensure token refresh and authentication
  const adminLogin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 3. Create a table permission
  const tablePermissionCreate = {
    permission_id: typia.random<string & tags.Format<"uuid">>(),
    table_name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IFlexOfficeTablePermission.ICreate;

  const tablePermission: IFlexOfficeTablePermission =
    await api.functional.flexOffice.admin.tablePermissions.createTablePermission(
      connection,
      { body: tablePermissionCreate },
    );
  typia.assert(tablePermission);

  // 4. Create a row permission under the created table permission
  const rowPermissionCreate: IFlexOfficeRowPermission.ICreate = {
    table_permission_id: tablePermission.id,
    filter_condition: `columnA = '${RandomGenerator.name(1)}'`,
  } satisfies IFlexOfficeRowPermission.ICreate;

  const rowPermission: IFlexOfficeRowPermission =
    await api.functional.flexOffice.admin.tablePermissions.rowPermissions.create(
      connection,
      {
        tablePermissionId: tablePermission.id,
        body: rowPermissionCreate,
      },
    );
  typia.assert(rowPermission);

  // 5. Update the row permission filter condition
  const newFilterCondition = `columnA LIKE '%${RandomGenerator.name(2)}%' AND columnB > 10`;
  const rowPermissionUpdate: IFlexOfficeRowPermission.IUpdate = {
    filter_condition: newFilterCondition,
    updated_at: new Date().toISOString(),
  } satisfies IFlexOfficeRowPermission.IUpdate;

  const updatedRowPermission: IFlexOfficeRowPermission =
    await api.functional.flexOffice.admin.tablePermissions.rowPermissions.update(
      connection,
      {
        tablePermissionId: tablePermission.id,
        rowPermissionId: rowPermission.id,
        body: rowPermissionUpdate,
      },
    );
  typia.assert(updatedRowPermission);

  // 6. Validate IDs and filter condition correctness
  TestValidator.equals(
    "tablePermissionId matches",
    updatedRowPermission.table_permission_id,
    tablePermission.id,
  );
  TestValidator.equals(
    "rowPermissionId matches",
    updatedRowPermission.id,
    rowPermission.id,
  );
  TestValidator.equals(
    "filter_condition is updated",
    updatedRowPermission.filter_condition,
    newFilterCondition,
  );
  TestValidator.predicate(
    "updated_at is recent",
    new Date(updatedRowPermission.updated_at).getTime() <= Date.now(),
  );
}
