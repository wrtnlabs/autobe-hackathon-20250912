import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IFlexOfficeExternalSheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeExternalSheet";

export async function test_api_external_sheet_detail_retrieval_success_and_not_found(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin_password_123",
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create data source
  const dataSourceBody = {
    name: `DataSource_${RandomGenerator.alphaNumeric(6)}`,
    type: "google_sheet",
    connection_info: "some connection details",
    is_active: true,
    deleted_at: null,
  } satisfies IFlexOfficeDataSource.ICreate;
  const dataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.admin.dataSources.create(connection, {
      body: dataSourceBody,
    });
  typia.assert(dataSource);

  // 3. Create external sheet linked to the data source
  const fixedSheetCount = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const externalSheetBody = {
    flex_office_data_source_id: dataSource.id,
    file_name: `Sheet_${RandomGenerator.alphaNumeric(5)}.xlsx`,
    file_url: `https://example.com/sheets/${RandomGenerator.alphaNumeric(10)}`,
    sheet_count: fixedSheetCount,
  } satisfies IFlexOfficeExternalSheet.ICreate;

  const externalSheet: IFlexOfficeExternalSheet =
    await api.functional.flexOffice.admin.dataSources.externalSheets.create(
      connection,
      {
        dataSourceId: dataSource.id,
        body: externalSheetBody,
      },
    );
  typia.assert(externalSheet);

  // 4. Retrieve external sheet detail and validate
  const retrievedSheet: IFlexOfficeExternalSheet =
    await api.functional.flexOffice.admin.dataSources.externalSheets.at(
      connection,
      {
        dataSourceId: dataSource.id,
        sheetId: externalSheet.id,
      },
    );
  typia.assert(retrievedSheet);

  TestValidator.equals(
    "retrieved sheet matches created sheet",
    retrievedSheet,
    externalSheet,
  );

  // 5. Error scenario: try retrieving with non-existent sheet ID
  const nonExistentSheetId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent sheet ID should return 404 error",
    async () => {
      await api.functional.flexOffice.admin.dataSources.externalSheets.at(
        connection,
        {
          dataSourceId: dataSource.id,
          sheetId: nonExistentSheetId,
        },
      );
    },
  );
}
