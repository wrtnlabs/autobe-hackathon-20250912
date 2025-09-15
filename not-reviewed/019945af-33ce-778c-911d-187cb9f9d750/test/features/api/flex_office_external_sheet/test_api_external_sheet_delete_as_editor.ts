import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficeExternalSheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeExternalSheet";

export async function test_api_external_sheet_delete_as_editor(
  connection: api.IConnection,
) {
  // 1. Register a new editor user
  const editorCreateBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IFlexOfficeEditor.ICreate;

  const editorAuthorizedResponse = await api.functional.auth.editor.join(
    connection,
    {
      body: editorCreateBody,
    },
  );
  typia.assert(editorAuthorizedResponse);

  // 2. Authenticate the editor user
  const loginBody = {
    email: editorCreateBody.email,
    password: editorCreateBody.password,
  } satisfies IFlexOfficeEditor.ILogin;

  const loginResponse = await api.functional.auth.editor.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResponse);

  // 3. Create a new data source
  const dataSourceCreateBody = {
    name: RandomGenerator.name(),
    type: "google_sheet",
    connection_info: "Sample connection info",
    is_active: true,
  } satisfies IFlexOfficeDataSource.ICreate;

  const createdDataSource =
    await api.functional.flexOffice.editor.dataSources.create(connection, {
      body: dataSourceCreateBody,
    });
  typia.assert(createdDataSource);

  // 4. Create an external sheet linked to the created data source
  const externalSheetCreateBody = {
    flex_office_data_source_id: createdDataSource.id,
    file_name: `TestFile_${RandomGenerator.alphaNumeric(6)}.xlsx`,
    file_url: `https://drive.google.com/spreadsheets/d/${RandomGenerator.alphaNumeric(44)}`,
    sheet_count:
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>() || 1,
  } satisfies IFlexOfficeExternalSheet.ICreate;

  const createdExternalSheet =
    await api.functional.flexOffice.editor.dataSources.externalSheets.create(
      connection,
      {
        dataSourceId: createdDataSource.id,
        body: externalSheetCreateBody,
      },
    );
  typia.assert(createdExternalSheet);

  // 5. Delete the external sheet
  await api.functional.flexOffice.editor.dataSources.externalSheets.erase(
    connection,
    {
      dataSourceId: createdDataSource.id,
      sheetId: createdExternalSheet.id,
    },
  );

  // 6. Attempt deletion again to validate proper error handling
  await TestValidator.error("second deletion should raise error", async () => {
    await api.functional.flexOffice.editor.dataSources.externalSheets.erase(
      connection,
      {
        dataSourceId: createdDataSource.id,
        sheetId: createdExternalSheet.id,
      },
    );
  });

  // 7. Attempt deletion without authentication
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated deletion should fail",
    async () => {
      await api.functional.flexOffice.editor.dataSources.externalSheets.erase(
        unauthenticatedConnection,
        {
          dataSourceId: createdDataSource.id,
          sheetId: createdExternalSheet.id,
        },
      );
    },
  );

  // 8. Attempt deletion with invalid dataSourceId
  await TestValidator.error(
    "deletion with invalid dataSourceId should fail",
    async () => {
      await api.functional.flexOffice.editor.dataSources.externalSheets.erase(
        connection,
        {
          dataSourceId: typia.random<string & tags.Format<"uuid">>(),
          sheetId: createdExternalSheet.id,
        },
      );
    },
  );

  // 9. Attempt deletion with invalid sheetId
  await TestValidator.error(
    "deletion with invalid sheetId should fail",
    async () => {
      await api.functional.flexOffice.editor.dataSources.externalSheets.erase(
        connection,
        {
          dataSourceId: createdDataSource.id,
          sheetId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
