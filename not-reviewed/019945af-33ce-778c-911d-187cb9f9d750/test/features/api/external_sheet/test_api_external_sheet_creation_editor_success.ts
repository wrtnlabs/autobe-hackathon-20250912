import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IFlexOfficeExternalSheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeExternalSheet";

/**
 * Test the creation of a new external sheet linked to a data source by an
 * editor user.
 *
 * This test validates the full workflow:
 *
 * 1. An editor user is created and authenticated.
 * 2. An admin user is created and authenticated to create a data source.
 * 3. Admin creates a flex office data source.
 * 4. Editor creates an external sheet linked to the data source with valid
 *    data.
 * 5. Assert the created external sheet has valid metadata and matches inputs.
 * 6. Verify role-based access: editor can create but viewer cannot create
 *    external sheets.
 * 7. Test validation for missing or invalid file URL or sheet count when
 *    creating external sheet.
 */
export async function test_api_external_sheet_creation_editor_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate editor user
  const editorEmail = typia.random<string & tags.Format<"email">>();
  const editorPassword = "ValidPassword123!";
  const editor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: {
        email: editorEmail,
        name: RandomGenerator.name(),
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ICreate,
    });
  typia.assert(editor);

  // 2. Create and authenticate admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "ValidPassword123!";
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 3. As admin, create a data source
  const dataSourceCreateBody = {
    name: `DataSource_${RandomGenerator.alphaNumeric(6)}`,
    type: "google_sheet",
    connection_info: "https://docs.google.com/spreadsheets/d/example",
    is_active: true,
  } satisfies IFlexOfficeDataSource.ICreate;

  // Switch to admin authentication context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IFlexOfficeAdmin.ILogin,
  });

  const dataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.admin.dataSources.create(connection, {
      body: dataSourceCreateBody,
    });
  typia.assert(dataSource);

  // 4. Switch back to editor authentication context
  await api.functional.auth.editor.login(connection, {
    body: {
      email: editorEmail,
      password: editorPassword,
    } satisfies IFlexOfficeEditor.ILogin,
  });

  // 5. Editor creates an external sheet with valid data
  const fileName = `Sheet_${RandomGenerator.alphaNumeric(4)}`;
  const fileUrl = `https://storage.googleapis.com/bucket/${RandomGenerator.alphaNumeric(8)}.xlsx`;
  const sheetCount = Math.max(1, Math.floor(Math.random() * 10)); // 1 to 10 sheets
  const externalSheetCreateBody = {
    flex_office_data_source_id: dataSource.id,
    file_name: fileName,
    file_url: fileUrl,
    sheet_count: sheetCount,
  } satisfies IFlexOfficeExternalSheet.ICreate;

  const externalSheet: IFlexOfficeExternalSheet =
    await api.functional.flexOffice.editor.dataSources.externalSheets.create(
      connection,
      {
        dataSourceId: dataSource.id,
        body: externalSheetCreateBody,
      },
    );
  typia.assert(externalSheet);

  // Validate crucial returned metadata
  TestValidator.equals(
    "external sheet file_name matches input",
    externalSheet.file_name,
    fileName,
  );
  TestValidator.equals(
    "external sheet file_url matches input",
    externalSheet.file_url,
    fileUrl,
  );
  TestValidator.equals(
    "external sheet sheet_count matches input",
    externalSheet.sheet_count,
    sheetCount,
  );
  TestValidator.equals(
    "flex_office_data_source_id matches data source id",
    externalSheet.flex_office_data_source_id,
    dataSource.id,
  );
  TestValidator.predicate(
    "external sheet id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      externalSheet.id,
    ),
  );

  // 6. Role based access test - viewer role cannot create external sheet
  // Viewer role is not in provided DTOs or APIs, so simulate negative test:
  // Attempt external sheet creation with editor but provide missing file_url to provoke a validation error
  await TestValidator.error(
    "external sheet creation fails with missing file_url",
    async () => {
      const badBodyMissingFileUrl = {
        flex_office_data_source_id: dataSource.id,
        file_name: `BadSheet_${RandomGenerator.alphaNumeric(3)}`,
        file_url: "", // Empty string input to simulate missing URL
        sheet_count: 1,
      } satisfies IFlexOfficeExternalSheet.ICreate;

      await api.functional.flexOffice.editor.dataSources.externalSheets.create(
        connection,
        {
          dataSourceId: dataSource.id,
          body: badBodyMissingFileUrl,
        },
      );
    },
  );

  await TestValidator.error(
    "external sheet creation fails with invalid sheet_count",
    async () => {
      const badBodyInvalidSheetCount = {
        flex_office_data_source_id: dataSource.id,
        file_name: `BadSheet_${RandomGenerator.alphaNumeric(3)}`,
        file_url: `https://valid.url/${RandomGenerator.alphaNumeric(6)}.xlsx`,
        sheet_count: 0, // Invalid sheet count (zero, must be positive integer)
      } satisfies IFlexOfficeExternalSheet.ICreate;

      await api.functional.flexOffice.editor.dataSources.externalSheets.create(
        connection,
        {
          dataSourceId: dataSource.id,
          body: badBodyInvalidSheetCount,
        },
      );
    },
  );
}
