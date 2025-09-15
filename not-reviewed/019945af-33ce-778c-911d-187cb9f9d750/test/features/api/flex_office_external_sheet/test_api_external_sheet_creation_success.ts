import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IFlexOfficeExternalSheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeExternalSheet";

export async function test_api_external_sheet_creation_success(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate an admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";

  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a FlexOffice data source
  const dataSourceCreate = {
    name: "DataSource_" + RandomGenerator.alphaNumeric(6),
    type: "google_sheet",
    connection_info: JSON.stringify({ key: "value" }),
    is_active: true,
    deleted_at: null,
  } satisfies IFlexOfficeDataSource.ICreate;

  const dataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.admin.dataSources.create(connection, {
      body: dataSourceCreate,
    });
  typia.assert(dataSource);

  // Step 3: Create an external sheet linked to the data source
  const sheetCount = Math.floor(RandomGenerator.alphaNumeric(1).length) || 1; // safe fallback 1

  const externalSheetCreate = {
    flex_office_data_source_id: dataSource.id,
    file_name: `Sheet_${RandomGenerator.alphaNumeric(5)}`,
    file_url: `https://storage.example.com/sheets/${RandomGenerator.alphaNumeric(10)}.xlsx`,
    sheet_count: Math.min(Math.max(sheetCount, 1), 100),
  } satisfies IFlexOfficeExternalSheet.ICreate;

  const externalSheet: IFlexOfficeExternalSheet =
    await api.functional.flexOffice.admin.dataSources.externalSheets.create(
      connection,
      {
        dataSourceId: dataSource.id,
        body: externalSheetCreate,
      },
    );
  typia.assert(externalSheet);

  // Validate association
  TestValidator.equals(
    "ExternalSheet linked to DataSource",
    externalSheet.flex_office_data_source_id,
    dataSource.id,
  );

  // Validate timestamps including optional nullable ones
  TestValidator.predicate(
    "created_at is valid ISO date-time string",
    typeof externalSheet.created_at === "string" &&
      !Number.isNaN(Date.parse(externalSheet.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time string",
    typeof externalSheet.updated_at === "string" &&
      !Number.isNaN(Date.parse(externalSheet.updated_at)),
  );

  TestValidator.equals(
    "last_synced_at is null or ISO date-time string",
    externalSheet.last_synced_at === null ||
      (typeof externalSheet.last_synced_at === "string" &&
        !Number.isNaN(Date.parse(externalSheet.last_synced_at))),
    true,
  );

  TestValidator.equals(
    "deleted_at is null or ISO date-time string",
    externalSheet.deleted_at === null ||
      (typeof externalSheet.deleted_at === "string" &&
        !Number.isNaN(Date.parse(externalSheet.deleted_at))),
    true,
  );

  // Step 4: Attempt to create a duplicate external sheet; expect an error
  await TestValidator.error(
    "creating duplicate external sheet should fail",
    async () => {
      await api.functional.flexOffice.admin.dataSources.externalSheets.create(
        connection,
        {
          dataSourceId: dataSource.id,
          body: externalSheetCreate,
        },
      );
    },
  );
}
