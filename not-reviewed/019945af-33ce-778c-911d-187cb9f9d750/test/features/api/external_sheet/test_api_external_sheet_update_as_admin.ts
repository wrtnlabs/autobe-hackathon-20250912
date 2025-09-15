import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IFlexOfficeExternalSheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeExternalSheet";

/**
 * Test updating an external sheet metadata record as an authenticated admin
 * user.
 *
 * Validates full admin user flow including registering and logging in an admin,
 * creating a data source, creating an external sheet, performing the update,
 * and asserting proper update including timestamps and field values.
 *
 * Also validates error handling for unauthorized access, invalid IDs, and
 * validation errors.
 */
export async function test_api_external_sheet_update_as_admin(
  connection: api.IConnection,
) {
  // 1. Register admin user and authenticate
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";

  const joinedAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(joinedAdmin);

  // After join, admin is authenticated automatically (authorization handled by SDK)

  // 2. Create a new data source
  const dataSourceCreateBody = {
    name: `DS-${RandomGenerator.alphaNumeric(6)}`,
    type: "google_sheet",
    connection_info: JSON.stringify({
      apiKey: RandomGenerator.alphaNumeric(24),
    }),
    is_active: true,
    deleted_at: null,
  } satisfies IFlexOfficeDataSource.ICreate;

  const dataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.admin.dataSources.create(connection, {
      body: dataSourceCreateBody,
    });
  typia.assert(dataSource);

  // 3. Create a new external sheet linked to the data source
  const externalSheetCreateBody = {
    flex_office_data_source_id: dataSource.id,
    file_name: `Sheet_${RandomGenerator.alphaNumeric(4)}.xlsx`,
    file_url: `https://example.com/sheets/${RandomGenerator.alphaNumeric(12)}`,
    sheet_count: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IFlexOfficeExternalSheet.ICreate;

  const externalSheet: IFlexOfficeExternalSheet =
    await api.functional.flexOffice.admin.dataSources.externalSheets.create(
      connection,
      {
        dataSourceId: dataSource.id,
        body: externalSheetCreateBody,
      },
    );
  typia.assert(externalSheet);

  // 4. Update the external sheet with new values
  const updatedFileName = `Updated_${RandomGenerator.alphaNumeric(6)}.xlsx`;
  const updatedFileUrl = `https://example.com/sheets/${RandomGenerator.alphaNumeric(15)}`;

  // Use current date in ISO 8601 format for last_synced_at
  const nowISOString = new Date().toISOString();

  const externalSheetUpdateBody = {
    file_name: updatedFileName,
    file_url: updatedFileUrl,
    sheet_count: externalSheet.sheet_count + 1,
    last_synced_at: nowISOString,
  } satisfies IFlexOfficeExternalSheet.IUpdate;

  const updatedExternalSheet: IFlexOfficeExternalSheet =
    await api.functional.flexOffice.admin.dataSources.externalSheets.update(
      connection,
      {
        dataSourceId: dataSource.id,
        sheetId: externalSheet.id,
        body: externalSheetUpdateBody,
      },
    );
  typia.assert(updatedExternalSheet);

  // Assert updated data matches expected values
  TestValidator.equals(
    "file_name should be updated",
    updatedExternalSheet.file_name,
    updatedFileName,
  );
  TestValidator.equals(
    "file_url should be updated",
    updatedExternalSheet.file_url,
    updatedFileUrl,
  );
  TestValidator.equals(
    "sheet_count should be incremented",
    updatedExternalSheet.sheet_count,
    externalSheet.sheet_count + 1,
  );
  TestValidator.equals(
    "last_synced_at should be updated",
    updatedExternalSheet.last_synced_at,
    nowISOString,
  );

  // Check timestamps format
  TestValidator.predicate(
    "created_at is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      updatedExternalSheet.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      updatedExternalSheet.updated_at,
    ),
  );

  // 5. Negative test: unauthorized update attempt
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized users cannot update external sheet",
    async () => {
      await api.functional.flexOffice.admin.dataSources.externalSheets.update(
        unauthenticatedConnection,
        {
          dataSourceId: dataSource.id,
          sheetId: externalSheet.id,
          body: externalSheetUpdateBody,
        },
      );
    },
  );

  // 6. Negative test: invalid dataSourceId
  await TestValidator.error(
    "update with invalid dataSourceId should fail",
    async () => {
      await api.functional.flexOffice.admin.dataSources.externalSheets.update(
        connection,
        {
          dataSourceId: "00000000-0000-0000-0000-000000000000",
          sheetId: externalSheet.id,
          body: externalSheetUpdateBody,
        },
      );
    },
  );

  // 7. Negative test: invalid sheetId
  await TestValidator.error(
    "update with invalid sheetId should fail",
    async () => {
      await api.functional.flexOffice.admin.dataSources.externalSheets.update(
        connection,
        {
          dataSourceId: dataSource.id,
          sheetId: "00000000-0000-0000-0000-000000000000",
          body: externalSheetUpdateBody,
        },
      );
    },
  );

  // 8. Negative test: missing required fields (no updates) should be allowed but no changes
  const noUpdateBody = {} satisfies IFlexOfficeExternalSheet.IUpdate;

  const noChangeSheet: IFlexOfficeExternalSheet =
    await api.functional.flexOffice.admin.dataSources.externalSheets.update(
      connection,
      {
        dataSourceId: dataSource.id,
        sheetId: externalSheet.id,
        body: noUpdateBody,
      },
    );
  typia.assert(noChangeSheet);

  // Should still have original values since no update
  TestValidator.equals(
    "file_name remains unchanged",
    noChangeSheet.file_name,
    updatedFileName,
  );
  TestValidator.equals(
    "file_url remains unchanged",
    noChangeSheet.file_url,
    updatedFileUrl,
  );

  // 9. Negative test: invalid data format (e.g., invalid URL) should fail
  await TestValidator.error(
    "update with invalid file_url format should fail",
    async () => {
      await api.functional.flexOffice.admin.dataSources.externalSheets.update(
        connection,
        {
          dataSourceId: dataSource.id,
          sheetId: externalSheet.id,
          body: {
            file_url: "not-a-valid-url",
          },
        },
      );
    },
  );
}
