import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IFlexOfficeExternalSheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeExternalSheet";
import type { IFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeViewer";

/**
 * Tests that an authenticated viewer user can successfully retrieve
 * metadata of an external sheet.
 *
 * This test performs the following steps:
 *
 * 1. Creates and authenticates an admin user.
 * 2. Creates a data source via the admin context.
 * 3. Creates an external sheet linked to the data source via admin.
 * 4. Creates and authenticates a viewer user.
 * 5. Retrieves the external sheet metadata as the viewer user.
 * 6. Validates all returned fields correctness and presence.
 * 7. Tests error handling for invalid or non-existent dataSourceId and
 *    sheetId.
 * 8. Tests unauthorized access denial when no authentication header is
 *    present.
 */
export async function test_api_external_sheet_retrieval_viewer_success(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "A1!a1!a1!";
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create data source by admin
  const dataSourceCreateBody = {
    name: RandomGenerator.name(),
    type: "google_sheet",
    connection_info: JSON.stringify({
      spreadsheetId: RandomGenerator.alphaNumeric(44),
      apiKey: RandomGenerator.alphaNumeric(32),
    }),
    is_active: true,
    deleted_at: null,
  } satisfies IFlexOfficeDataSource.ICreate;
  const dataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.admin.dataSources.create(connection, {
      body: dataSourceCreateBody,
    });
  typia.assert(dataSource);

  // Step 3: Create an external sheet linked to the data source
  const externalSheetCreateBody = {
    flex_office_data_source_id: dataSource.id,
    file_name: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 8,
    }),
    file_url: `https://docs.google.com/spreadsheets/d/${RandomGenerator.alphaNumeric(44)}/edit#gid=0`,
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

  // Step 4: Create and authenticate viewer user
  const viewerEmail = typia.random<string & tags.Format<"email">>();
  const viewerPassword = "B2!b2!b2!";
  const viewer: IFlexOfficeViewer.IAuthorized =
    await api.functional.auth.viewer.join(connection, {
      body: {
        name: RandomGenerator.name(),
        email: viewerEmail,
        password: viewerPassword,
      } satisfies IFlexOfficeViewer.ICreate,
    });
  typia.assert(viewer);

  await api.functional.auth.viewer.login(connection, {
    body: {
      email: viewerEmail,
      password: viewerPassword,
    } satisfies IFlexOfficeViewer.ILogin,
  });

  // Step 5: Retrieve external sheet metadata as viewer
  const retrievedSheet: IFlexOfficeExternalSheet =
    await api.functional.flexOffice.viewer.dataSources.externalSheets.at(
      connection,
      {
        dataSourceId: dataSource.id,
        sheetId: externalSheet.id,
      },
    );
  typia.assert(retrievedSheet);

  // Validate metadata fields
  TestValidator.equals(
    "retrieved sheet id equals",
    retrievedSheet.id,
    externalSheet.id,
  );
  TestValidator.equals(
    "data source id matches",
    retrievedSheet.flex_office_data_source_id,
    dataSource.id,
  );
  TestValidator.equals(
    "file name matches",
    retrievedSheet.file_name,
    externalSheet.file_name,
  );
  TestValidator.equals(
    "file url matches",
    retrievedSheet.file_url,
    externalSheet.file_url,
  );
  TestValidator.equals(
    "sheet count matches",
    retrievedSheet.sheet_count,
    externalSheet.sheet_count,
  );

  // Ensure timestamps are strings (typia.assert covers format)
  typia.assert<string>(retrievedSheet.created_at);
  typia.assert<string>(retrievedSheet.updated_at);

  // last_synced_at and deleted_at can be null or string
  if (
    retrievedSheet.last_synced_at !== null &&
    retrievedSheet.last_synced_at !== undefined
  ) {
    typia.assert<string>(retrievedSheet.last_synced_at);
  } else {
    TestValidator.equals(
      "last_synced_at is null or undefined",
      retrievedSheet.last_synced_at,
      null,
    );
  }

  if (
    retrievedSheet.deleted_at !== null &&
    retrievedSheet.deleted_at !== undefined
  ) {
    typia.assert<string>(retrievedSheet.deleted_at);
  } else {
    TestValidator.equals(
      "deleted_at is null or undefined",
      retrievedSheet.deleted_at,
      null,
    );
  }

  // Step 6: Test error handling for invalid dataSourceId and sheetId
  await TestValidator.error(
    "error when dataSourceId is invalid (viewer)",
    async () => {
      await api.functional.flexOffice.viewer.dataSources.externalSheets.at(
        connection,
        {
          dataSourceId: "00000000-0000-0000-0000-000000000000",
          sheetId: externalSheet.id,
        },
      );
    },
  );

  await TestValidator.error(
    "error when sheetId is invalid (viewer)",
    async () => {
      await api.functional.flexOffice.viewer.dataSources.externalSheets.at(
        connection,
        {
          dataSourceId: dataSource.id,
          sheetId: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );

  // Step 7: Test unauthorized access by using unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access without auth", async () => {
    await api.functional.flexOffice.viewer.dataSources.externalSheets.at(
      unauthConn,
      {
        dataSourceId: dataSource.id,
        sheetId: externalSheet.id,
      },
    );
  });
}
