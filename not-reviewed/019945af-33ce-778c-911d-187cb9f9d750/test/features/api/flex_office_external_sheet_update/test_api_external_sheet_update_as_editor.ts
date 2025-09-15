import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficeExternalSheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeExternalSheet";

/**
 * Test editor user flow to create and update an external sheet tied to a data
 * source.
 *
 * Workflow:
 *
 * 1. Editor user joins and logs in.
 * 2. Data source is created.
 * 3. External sheet is created linked to the data source.
 * 4. External sheet is updated with new file name and URL.
 * 5. Validates the update persists and fields match expectations.
 * 6. Tests error scenarios including unauthorized updates and invalid IDs.
 */
export async function test_api_external_sheet_update_as_editor(
  connection: api.IConnection,
) {
  // 1. Editor registration and login
  const editorName = RandomGenerator.name();
  const editorEmail = typia.random<string & tags.Format<"email">>();
  const editorPassword = "Password123!";

  // Join editor
  const joinedEditor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: {
        name: editorName,
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ICreate,
    });
  typia.assert(joinedEditor);

  // Login editor
  const loggedEditor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: {
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ILogin,
    });
  typia.assert(loggedEditor);

  // 2. Create a new data source
  const dataSourceName = RandomGenerator.name();
  const dataSourceType = RandomGenerator.pick([
    "mysql",
    "postgresql",
    "google_sheet",
    "excel",
  ] as const);
  const connectionInfo = JSON.stringify({
    host: "localhost",
    port: 3306,
    database: "testdb",
    user: "user",
    password: "password",
  });

  const newDataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.editor.dataSources.create(connection, {
      body: {
        name: dataSourceName,
        type: dataSourceType,
        connection_info: connectionInfo,
        is_active: true,
      } satisfies IFlexOfficeDataSource.ICreate,
    });
  typia.assert(newDataSource);

  // 3. Create an external sheet linked to the data source
  const externalSheetFileName = `${RandomGenerator.name(2)}.xlsx`;
  const externalSheetFileUrl = `https://files.flexoffice.com/sheets/${RandomGenerator.alphaNumeric(20)}.xlsx`;
  const sheetCount = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >() satisfies number as number;

  const newExternalSheet: IFlexOfficeExternalSheet =
    await api.functional.flexOffice.editor.dataSources.externalSheets.create(
      connection,
      {
        dataSourceId: newDataSource.id,
        body: {
          flex_office_data_source_id: newDataSource.id,
          file_name: externalSheetFileName,
          file_url: externalSheetFileUrl,
          sheet_count: sheetCount,
        } satisfies IFlexOfficeExternalSheet.ICreate,
      },
    );
  typia.assert(newExternalSheet);

  // 4. Perform update on the external sheet
  const updatedFileName = `${RandomGenerator.name(2)}_updated.xlsx`;
  const updatedFileUrl = `https://files.flexoffice.com/sheets/${RandomGenerator.alphaNumeric(25)}_updated.xlsx`;
  const updatedSheetCount = (newExternalSheet.sheet_count + 1) as number;
  const updatedLastSyncedAt = new Date().toISOString();

  const updatedExternalSheet: IFlexOfficeExternalSheet =
    await api.functional.flexOffice.editor.dataSources.externalSheets.update(
      connection,
      {
        dataSourceId: newDataSource.id,
        sheetId: newExternalSheet.id,
        body: {
          file_name: updatedFileName,
          file_url: updatedFileUrl,
          sheet_count: updatedSheetCount,
          last_synced_at: updatedLastSyncedAt,
        } satisfies IFlexOfficeExternalSheet.IUpdate,
      },
    );
  typia.assert(updatedExternalSheet);

  // 5. Verify updates persisted correctly
  TestValidator.equals(
    "Updated file_name should match",
    updatedExternalSheet.file_name,
    updatedFileName,
  );
  TestValidator.equals(
    "Updated file_url should match",
    updatedExternalSheet.file_url,
    updatedFileUrl,
  );
  TestValidator.equals(
    "Updated sheet_count should match",
    updatedExternalSheet.sheet_count,
    updatedSheetCount,
  );
  TestValidator.predicate(
    "Last synced at should be valid ISO date",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z$/.test(
      updatedExternalSheet.last_synced_at ?? "",
    ),
  );

  // 6. Test error scenarios

  // Attempt update with invalid data source ID
  await TestValidator.error(
    "Update fails with invalid dataSourceId",
    async () => {
      await api.functional.flexOffice.editor.dataSources.externalSheets.update(
        connection,
        {
          dataSourceId: typia.random<string & tags.Format<"uuid">>(),
          sheetId: newExternalSheet.id,
          body: {
            file_name: updatedFileName,
          } satisfies IFlexOfficeExternalSheet.IUpdate,
        },
      );
    },
  );

  // Attempt update with invalid sheetId
  await TestValidator.error("Update fails with invalid sheetId", async () => {
    await api.functional.flexOffice.editor.dataSources.externalSheets.update(
      connection,
      {
        dataSourceId: newDataSource.id,
        sheetId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          file_name: updatedFileName,
        } satisfies IFlexOfficeExternalSheet.IUpdate,
      },
    );
  });

  // TODO: Add unauthorized access test when connection changes user context
  // For now, we assume the SDK manages user context internally
}
