import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeColumnPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeColumnPermission";
import type { IFlexOfficePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePermission";
import type { IFlexOfficeTablePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTablePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeColumnPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeColumnPermission";

export async function test_api_column_permission_listing_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Admin Join (Register and Authenticate)
  const adminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePassword123!",
  } satisfies IFlexOfficeAdmin.ICreate;

  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreate,
    });
  typia.assert(admin);

  // 2. Create Permission Entity
  const permissionCreate = {
    permission_key: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
  } satisfies IFlexOfficePermission.ICreate;

  const permission: IFlexOfficePermission =
    await api.functional.flexOffice.admin.permissions.create(connection, {
      body: permissionCreate,
    });
  typia.assert(permission);

  // 3. Create Table Permission linked to created permission
  const tablePermissionCreate = {
    permission_id: permission.id,
    table_name: RandomGenerator.name(2).replace(/\s/g, "_"),
  } satisfies IFlexOfficeTablePermission.ICreate;

  const tablePermission: IFlexOfficeTablePermission =
    await api.functional.flexOffice.admin.tablePermissions.createTablePermission(
      connection,
      {
        body: tablePermissionCreate,
      },
    );
  typia.assert(tablePermission);

  // 4. Create multiple Column Permissions linked to Table Permission
  const columnPermissions: IFlexOfficeColumnPermission[] = [];

  for (let i = 0; i < 3; ++i) {
    const columnPermissionCreate = {
      table_permission_id: tablePermission.id,
      column_name: `col_${RandomGenerator.alphaNumeric(6)}`,
    } satisfies IFlexOfficeColumnPermission.ICreate;

    const columnPermission =
      await api.functional.flexOffice.admin.tablePermissions.columnPermissions.createColumnPermission(
        connection,
        {
          tablePermissionId: tablePermission.id,
          body: columnPermissionCreate,
        },
      );
    typia.assert(columnPermission);
    columnPermissions.push(columnPermission);
  }

  // 5. Paginated search for column permissions filtered by tablePermissionId
  const pageRequest = {
    column_name: undefined,
    page: 1,
    limit: 10,
  } satisfies IFlexOfficeColumnPermission.IRequest;

  const pageResult: IPageIFlexOfficeColumnPermission.ISummary =
    await api.functional.flexOffice.admin.tablePermissions.columnPermissions.index(
      connection,
      {
        tablePermissionId: tablePermission.id,
        body: pageRequest,
      },
    );
  typia.assert(pageResult);

  // 6. Validate that all returned column permissions belong to the correct tablePermissionId
  TestValidator.predicate(
    "All returned column permissions belong to the queried tablePermissionId",
    pageResult.data.every(
      (cp) => cp.table_permission_id === tablePermission.id,
    ),
  );

  // 7. Validate pagination metadata correctness
  TestValidator.equals(
    "pagination current page",
    pageResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    pageResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is sufficient",
    pageResult.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records count matches actual data length or more",
    pageResult.pagination.records >= pageResult.data.length,
  );

  // 8. Validate the number of total records is >= the number of created column permissions
  TestValidator.predicate(
    "total records count is at least the number of created column permissions",
    pageResult.pagination.records >= columnPermissions.length,
  );

  // 9. Validate that the created column permissions exist in the result data
  columnPermissions.forEach((createdPermission) => {
    TestValidator.predicate(
      `created column permission with id '${createdPermission.id}' is included in the result data`,
      pageResult.data.some((cp) => cp.id === createdPermission.id),
    );
  });
}
