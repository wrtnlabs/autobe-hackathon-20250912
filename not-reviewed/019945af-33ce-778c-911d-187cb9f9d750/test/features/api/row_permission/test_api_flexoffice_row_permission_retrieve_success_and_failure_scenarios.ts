import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeRowPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeRowPermission";
import type { IFlexOfficeTablePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeTablePermission";

/**
 * Test retrieving detailed information of a specific row-level permission
 * identified by its rowPermissionId and scoped under a tablePermissionId.
 *
 * This test includes:
 *
 * 1. Admin user sign up and login to gain authorization tokens.
 * 2. Creation of a table permission record.
 * 3. Creation of a row permission linked to the created table permission.
 * 4. Retrieval of the created row permission and validation of the response
 *    data.
 * 5. Negative tests including retrieval with non-existent rowPermissionId and
 *    tablePermissionId resulting in 404 errors.
 * 6. Unauthorized retrieval attempt without authentication, expecting failure.
 *
 * All returned data is validated against the schema using typia.assert to
 * ensure correctness.
 */
export async function test_api_flexoffice_row_permission_retrieve_success_and_failure_scenarios(
  connection: api.IConnection,
) {
  // 1. Admin account join (sign up)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Str0ngP@ssw0rd!";
  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // 2. Admin login to acquire JWT tokens
  const adminLogin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 3. Create a table permission record
  const tablePermissionCreateBody = {
    permission_id: typia.random<string & tags.Format<"uuid">>(),
    table_name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IFlexOfficeTablePermission.ICreate;
  const tablePermission: IFlexOfficeTablePermission =
    await api.functional.flexOffice.admin.tablePermissions.createTablePermission(
      connection,
      {
        body: tablePermissionCreateBody,
      },
    );
  typia.assert(tablePermission);

  // 4. Create a row permission linked to the table permission
  const rowPermissionCreateBody = {
    table_permission_id: tablePermission.id,
    filter_condition: `test_column = '${RandomGenerator.alphabets(8)}'`,
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

  // 5. Successful retrieval of the created row permission
  const retrievedRowPermission: IFlexOfficeRowPermission =
    await api.functional.flexOffice.admin.tablePermissions.rowPermissions.at(
      connection,
      {
        tablePermissionId: tablePermission.id,
        rowPermissionId: rowPermission.id,
      },
    );
  typia.assert(retrievedRowPermission);
  TestValidator.equals(
    "rowPermission.id matches created",
    retrievedRowPermission.id,
    rowPermission.id,
  );
  TestValidator.equals(
    "rowPermission.table_permission_id matches tablePermission.id",
    retrievedRowPermission.table_permission_id,
    tablePermission.id,
  );
  TestValidator.equals(
    "rowPermission.filter_condition matches",
    retrievedRowPermission.filter_condition,
    rowPermission.filter_condition,
  );

  // Check timestamps are valid ISO date strings and updated_at >= created_at
  const isValidISODate = (date: string): boolean => !isNaN(Date.parse(date));
  TestValidator.predicate(
    "rowPermission.created_at is valid ISO date-time",
    isValidISODate(retrievedRowPermission.created_at),
  );
  TestValidator.predicate(
    "rowPermission.updated_at is valid ISO date-time",
    isValidISODate(retrievedRowPermission.updated_at),
  );
  TestValidator.predicate(
    "updated_at >= created_at",
    Date.parse(retrievedRowPermission.updated_at) >=
      Date.parse(retrievedRowPermission.created_at),
  );

  // 6. Failure retrieval: Non-existent rowPermissionId
  let nonExistentRowId = typia.random<string & tags.Format<"uuid">>();
  if (nonExistentRowId === rowPermission.id) {
    nonExistentRowId = typia.random<string & tags.Format<"uuid">>();
  }
  await TestValidator.error("error on invalid rowPermissionId", async () => {
    await api.functional.flexOffice.admin.tablePermissions.rowPermissions.at(
      connection,
      {
        tablePermissionId: tablePermission.id,
        rowPermissionId: nonExistentRowId,
      },
    );
  });

  // 7. Failure retrieval: Non-existent tablePermissionId
  let nonExistentTableId = typia.random<string & tags.Format<"uuid">>();
  if (nonExistentTableId === tablePermission.id) {
    nonExistentTableId = typia.random<string & tags.Format<"uuid">>();
  }
  await TestValidator.error("error on invalid tablePermissionId", async () => {
    await api.functional.flexOffice.admin.tablePermissions.rowPermissions.at(
      connection,
      {
        tablePermissionId: nonExistentTableId,
        rowPermissionId: rowPermission.id,
      },
    );
  });

  // 8. Unauthorized access: Attempt retrieve without login
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("error on unauthorized access", async () => {
    await api.functional.flexOffice.admin.tablePermissions.rowPermissions.at(
      unauthConnection,
      {
        tablePermissionId: tablePermission.id,
        rowPermissionId: rowPermission.id,
      },
    );
  });
}
