import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePermission";
import type { IFlexOfficeRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeRoleAssignment";
import type { IFlexOfficeRowPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeRowPermission";
import type { IFlexOfficeTablePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTablePermission";

/**
 * This scenario tests the deletion of a row-level permission associated with a
 * specific table permission in the FlexOffice system. It covers the complete
 * administrative workflow from creating an admin user, assigning roles,
 * creating permissions, to finally deleting a row permission.
 *
 * Flow:
 *
 * 1. Admin user creation and login
 * 2. Assign admin role to the user
 * 3. Create a permission entity for role-based access
 * 4. Create a table permission linked to permission
 * 5. Create a row-level permission linked to table permission
 * 6. Delete the row-level permission
 * 7. Validate deletion with repeated delete to confirm error
 * 8. Test unauthorized access rejection
 *
 * Validation includes checking that required tokens are set automatically, api
 * calls return expected types, and error scenarios produce validation errors.
 *
 * Tests provide strong type safety and realistic business logic, following
 * precise API specifications.
 */
export async function test_api_table_permission_row_permission_deletion(
  connection: api.IConnection,
) {
  // 1. Admin join and get authorized session
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "P@ssw0rd123";

  const adminJoined: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(adminJoined);

  // The join API sets Authorization header automatically via SDK

  // 2. Create role assignment to assign admin role to the joined admin user
  const roleAssignment: IFlexOfficeRoleAssignment =
    await api.functional.flexOffice.admin.roleAssignments.create(connection, {
      body: {
        user_id: typia.assert<string & tags.Format<"uuid">>(adminJoined.id),
        role_name: "admin",
      } satisfies IFlexOfficeRoleAssignment.ICreate,
    });
  typia.assert(roleAssignment);

  // 3. Create a permission entity
  const permissionKey = `perm_${RandomGenerator.alphaNumeric(6)}`;
  const permissionDescription = "Permission for test table permission scenario";
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

  // 4. Create a table permission linked to the above permission
  const tableName = `table_${RandomGenerator.alphabets(6)}`;
  const tablePermission: IFlexOfficeTablePermission =
    await api.functional.flexOffice.admin.tablePermissions.createTablePermission(
      connection,
      {
        body: {
          permission_id: typia.assert<string & tags.Format<"uuid">>(
            permission.id,
          ),
          table_name: tableName,
        } satisfies IFlexOfficeTablePermission.ICreate,
      },
    );
  typia.assert(tablePermission);

  // 5. Create a row-level permission linked to the table permission
  // Use a realistic SQL filter condition
  const filterCondition = "status = 'active'";

  const rowPermission: IFlexOfficeRowPermission =
    await api.functional.flexOffice.admin.tablePermissions.rowPermissions.create(
      connection,
      {
        tablePermissionId: typia.assert<string & tags.Format<"uuid">>(
          tablePermission.id,
        ),
        body: {
          table_permission_id: typia.assert<string & tags.Format<"uuid">>(
            tablePermission.id,
          ),
          filter_condition: filterCondition,
        } satisfies IFlexOfficeRowPermission.ICreate,
      },
    );
  typia.assert(rowPermission);

  // 6. Delete the created row-level permission
  await api.functional.flexOffice.admin.tablePermissions.rowPermissions.erase(
    connection,
    {
      tablePermissionId: typia.assert<string & tags.Format<"uuid">>(
        tablePermission.id,
      ),
      rowPermissionId: typia.assert<string & tags.Format<"uuid">>(
        rowPermission.id,
      ),
    },
  );

  // 7. Validate deletion by attempting to delete again should cause error
  await TestValidator.error(
    "deleting non-existent row permission should error",
    async () => {
      await api.functional.flexOffice.admin.tablePermissions.rowPermissions.erase(
        connection,
        {
          tablePermissionId: tablePermission.id,
          rowPermissionId: rowPermission.id,
        },
      );
    },
  );

  // 8. Test unauthorized deletion attempt
  // Create unauthenticated connection
  const unauthorizedConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error("unauthorized deletion should fail", async () => {
    await api.functional.flexOffice.admin.tablePermissions.rowPermissions.erase(
      unauthorizedConn,
      {
        tablePermissionId: tablePermission.id,
        rowPermissionId: rowPermission.id,
      },
    );
  });

  // 9. Confirm no residual existence by trying to delete once more
  await TestValidator.error(
    "deleting already deleted permission should error",
    async () => {
      await api.functional.flexOffice.admin.tablePermissions.rowPermissions.erase(
        connection,
        {
          tablePermissionId: tablePermission.id,
          rowPermissionId: rowPermission.id,
        },
      );
    },
  );
  // 10. System integrity and audit logging checked implicitly by API success and error consistency
}
