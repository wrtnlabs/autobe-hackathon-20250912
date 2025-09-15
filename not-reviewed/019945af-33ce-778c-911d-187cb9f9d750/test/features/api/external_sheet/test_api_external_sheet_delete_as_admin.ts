import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IFlexOfficeExternalSheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeExternalSheet";

/**
 * End-to-end test verifying external sheet deletion as an authorized admin
 * user.
 *
 * Validates the full workflow from admin creation, login, data source and
 * external sheet creation to authorized deletion of the external sheet,
 * ensuring only admins can delete, for success and failure scenarios including
 * unauthorized access, non-existent IDs, and proper API response validation.
 */
export async function test_api_external_sheet_delete_as_admin(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "P@ssw0rd1234";
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin login
  const login: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(login);

  // 3. Create data source
  const dataSourceInput = {
    name: RandomGenerator.name(),
    type: RandomGenerator.pick([
      "mysql",
      "postgresql",
      "google_sheet",
      "excel",
    ] as const),
    connection_info: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 10,
      wordMax: 20,
    }),
    is_active: true,
    deleted_at: null,
  } satisfies IFlexOfficeDataSource.ICreate;

  const dataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.admin.dataSources.create(connection, {
      body: dataSourceInput,
    });
  typia.assert(dataSource);

  // 4. Create external sheet
  const externalSheetInput = {
    flex_office_data_source_id: dataSource.id,
    file_name: `${RandomGenerator.name()}_${RandomGenerator.alphaNumeric(5)}.xlsx`,
    file_url: `https://example.com/files/${RandomGenerator.alphaNumeric(32)}`,
    sheet_count: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IFlexOfficeExternalSheet.ICreate;

  const externalSheet: IFlexOfficeExternalSheet =
    await api.functional.flexOffice.admin.dataSources.externalSheets.create(
      connection,
      {
        dataSourceId: dataSource.id,
        body: externalSheetInput,
      },
    );
  typia.assert(externalSheet);

  // 5. Delete external sheet - authorized
  await api.functional.flexOffice.admin.dataSources.externalSheets.erase(
    connection,
    {
      dataSourceId: dataSource.id,
      sheetId: externalSheet.id,
    },
  );

  // 6. Validation Checks

  // 6.1 Attempt delete without auth (simulate unauth connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "delete without authentication should fail",
    async () => {
      await api.functional.flexOffice.admin.dataSources.externalSheets.erase(
        unauthConn,
        {
          dataSourceId: dataSource.id,
          sheetId: externalSheet.id,
        },
      );
    },
  );

  // 6.2 Attempt delete with invalid token
  const invalidTokenConn: api.IConnection = {
    ...connection,
    headers: { Authorization: "Bearer invalid.token.value" },
  };
  await TestValidator.error(
    "delete with invalid token should fail",
    async () => {
      await api.functional.flexOffice.admin.dataSources.externalSheets.erase(
        invalidTokenConn,
        {
          dataSourceId: dataSource.id,
          sheetId: externalSheet.id,
        },
      );
    },
  );

  // 6.3 Attempt delete with non-existent dataSourceId
  await TestValidator.error(
    "delete with non-existent dataSourceId should fail",
    async () => {
      await api.functional.flexOffice.admin.dataSources.externalSheets.erase(
        connection,
        {
          dataSourceId: typia.random<string & tags.Format<"uuid">>(),
          sheetId: externalSheet.id,
        },
      );
    },
  );

  // 6.4 Attempt delete with non-existent sheetId
  await TestValidator.error(
    "delete with non-existent sheetId should fail",
    async () => {
      await api.functional.flexOffice.admin.dataSources.externalSheets.erase(
        connection,
        {
          dataSourceId: dataSource.id,
          sheetId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
