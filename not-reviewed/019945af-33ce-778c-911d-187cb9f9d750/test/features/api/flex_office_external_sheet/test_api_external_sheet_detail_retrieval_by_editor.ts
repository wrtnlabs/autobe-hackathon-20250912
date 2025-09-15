import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficeExternalSheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeExternalSheet";

/**
 * Validate that an editor user can retrieve detailed metadata about a specific
 * external sheet associated with a data source.
 *
 * This E2E test outlines the full flow:
 *
 * 1. Register and authenticate an editor user.
 * 2. Create a new data source owned by the editor user.
 * 3. Upload a new external sheet linked to the data source.
 * 4. Retrieve the external sheet detail using the dataSourceId and sheetId.
 * 5. Validate the response fields (file names, URLs, timestamps, and audit
 *    fields).
 * 6. Test error scenarios: access denied, invalid dataSourceId or sheetId.
 */
export async function test_api_external_sheet_detail_retrieval_by_editor(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate editor user
  const editorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const editorBody = {
    name: RandomGenerator.name(),
    email: editorEmail,
    password: "UltraStrongP@ssw0rd!",
  } satisfies IFlexOfficeEditor.ICreate;

  const editor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, { body: editorBody });
  typia.assert(editor);

  // Step 2: Create a new data source
  const dataSourceBody = {
    name: RandomGenerator.name(),
    type: "google_sheet",
    connection_info: "oauth2-token:placeholder-token",
    is_active: true,
    deleted_at: null,
  } satisfies IFlexOfficeDataSource.ICreate;

  const dataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.editor.dataSources.create(connection, {
      body: dataSourceBody,
    });
  typia.assert(dataSource);

  // Step 3: Create/upload an external sheet for data source
  const externalSheetBody = {
    flex_office_data_source_id: dataSource.id,
    file_name: `TestSheet-${RandomGenerator.alphaNumeric(5)}.xlsx`,
    file_url: `https://example.com/sheets/${RandomGenerator.alphaNumeric(15)}`,
    sheet_count: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
  } satisfies IFlexOfficeExternalSheet.ICreate;

  const externalSheet: IFlexOfficeExternalSheet =
    await api.functional.flexOffice.editor.dataSources.externalSheets.create(
      connection,
      {
        dataSourceId: dataSource.id,
        body: externalSheetBody,
      },
    );
  typia.assert(externalSheet);

  // Step 4: Retrieve the external sheet detail
  const retrievedSheet: IFlexOfficeExternalSheet =
    await api.functional.flexOffice.editor.dataSources.externalSheets.at(
      connection,
      {
        dataSourceId: dataSource.id,
        sheetId: externalSheet.id,
      },
    );
  typia.assert(retrievedSheet);

  // Step 5: Validate response matches created data
  TestValidator.equals(
    "external sheet id should match",
    retrievedSheet.id,
    externalSheet.id,
  );
  TestValidator.equals(
    "external sheet dataSourceId should match",
    retrievedSheet.flex_office_data_source_id,
    dataSource.id,
  );
  TestValidator.equals(
    "external sheet file name should match",
    retrievedSheet.file_name,
    externalSheetBody.file_name,
  );
  TestValidator.equals(
    "external sheet file url should match",
    retrievedSheet.file_url,
    externalSheetBody.file_url,
  );
  TestValidator.equals(
    "external sheet sheet count should match",
    retrievedSheet.sheet_count,
    externalSheetBody.sheet_count,
  );
  TestValidator.predicate(
    "external sheet created_at is ISO date",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.\d+)?Z$/.test(
      retrievedSheet.created_at,
    ),
  );
  TestValidator.predicate(
    "external sheet updated_at is ISO date",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.\d+)?Z$/.test(
      retrievedSheet.updated_at,
    ),
  );

  // Step 6: Edge case error validations
  // Attempt retrieve with invalid dataSourceId
  await TestValidator.error(
    "should fail with invalid dataSourceId",
    async () => {
      await api.functional.flexOffice.editor.dataSources.externalSheets.at(
        connection,
        {
          dataSourceId: "00000000-0000-0000-0000-000000000000",
          sheetId: externalSheet.id,
        },
      );
    },
  );

  // Attempt retrieve with invalid sheetId
  await TestValidator.error("should fail with invalid sheetId", async () => {
    await api.functional.flexOffice.editor.dataSources.externalSheets.at(
      connection,
      {
        dataSourceId: dataSource.id,
        sheetId: "00000000-0000-0000-0000-000000000000",
      },
    );
  });

  // Attempt create external sheet with inactive connection
  // Switch to another editor (new user) to test access control
  const anotherEditorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const anotherEditorBody: IFlexOfficeEditor.ICreate = {
    name: RandomGenerator.name(),
    email: anotherEditorEmail,
    password: "AnotherStrongP@ss1",
  };
  await api.functional.auth.editor.join(connection, {
    body: anotherEditorBody,
  });

  // Now this new editor tries to access the external sheet of the first editor
  // Should fail with access control error
  await TestValidator.error(
    "should fail when another editor tries to access external sheet",
    async () => {
      await api.functional.flexOffice.editor.dataSources.externalSheets.at(
        connection,
        {
          dataSourceId: dataSource.id,
          sheetId: externalSheet.id,
        },
      );
    },
  );
}
