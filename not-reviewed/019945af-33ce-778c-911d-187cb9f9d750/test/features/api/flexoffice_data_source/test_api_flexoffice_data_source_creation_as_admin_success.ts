import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";

export async function test_api_flexoffice_data_source_creation_as_admin_success(
  connection: api.IConnection,
) {
  // 1. Admin user registration (join) with random valid email and password
  const adminCreatePayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IFlexOfficeAdmin.ICreate;

  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreatePayload,
    });
  typia.assert(adminAuthorized);

  // 2. Admin user login for authentication tokens
  const adminLoginPayload = {
    email: adminCreatePayload.email,
    password: adminCreatePayload.password,
  } satisfies IFlexOfficeAdmin.ILogin;

  const adminLoginAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginPayload,
    });
  typia.assert(adminLoginAuthorized);

  // 3. Creating different types of data sources with valid connection info
  // Supported types: mysql, postgresql, google_sheet, excel
  // The connection_info should be meaningful JSON strings representing connection settings

  // Prepare an array of valid data sources to create
  const dataSourceInputs = [
    {
      name: `mysql-${RandomGenerator.alphaNumeric(6)}`,
      type: "mysql",
      connection_info: JSON.stringify({
        host: "127.0.0.1",
        port: 3306,
        user: "root",
        password: "password",
        database: "flexoffice",
      }),
      is_active: true,
      deleted_at: null,
    },
    {
      name: `postgresql-${RandomGenerator.alphaNumeric(6)}`,
      type: "postgresql",
      connection_info: JSON.stringify({
        host: "localhost",
        port: 5432,
        user: "postgres",
        password: "password",
        database: "flexoffice_db",
      }),
      is_active: true,
      deleted_at: null,
    },
    {
      name: `google_sheet-${RandomGenerator.alphaNumeric(6)}`,
      type: "google_sheet",
      connection_info: JSON.stringify({
        spreadsheetId: "1abcDEFghijklmnopQrstUVWXyz",
        sheetName: "Sheet1",
        apiKey: typia.random<string>(),
      }),
      is_active: true,
      deleted_at: null,
    },
    {
      name: `excel-${RandomGenerator.alphaNumeric(6)}`,
      type: "excel",
      connection_info: JSON.stringify({
        filePath: "/data/sources/sample.xlsx",
        password: "",
      }),
      is_active: true,
      deleted_at: null,
    },
  ];

  // 4. For each data source input, create it via the API and validate the response
  for (const input of dataSourceInputs) {
    const createdDataSource: IFlexOfficeDataSource =
      await api.functional.flexOffice.admin.dataSources.create(connection, {
        body: input satisfies IFlexOfficeDataSource.ICreate,
      });
    typia.assert(createdDataSource);

    TestValidator.equals(
      `name should match for type ${input.type}`,
      createdDataSource.name,
      input.name,
    );
    TestValidator.equals(
      `type should match for data source ${input.name}`,
      createdDataSource.type,
      input.type,
    );
    TestValidator.equals(
      `connection_info should match for data source ${input.name}`,
      createdDataSource.connection_info,
      input.connection_info,
    );
    TestValidator.predicate(
      `is_active should be true for data source ${input.name}`,
      createdDataSource.is_active === true,
    );
    TestValidator.predicate(
      `deleted_at should be null or undefined for data source ${input.name}`,
      createdDataSource.deleted_at === null ||
        createdDataSource.deleted_at === undefined,
    );

    // Validate that created_at and updated_at are valid ISO date-time strings
    TestValidator.predicate(
      `created_at is ISO date-time for data source ${input.name}`,
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(
        createdDataSource.created_at,
      ),
    );
    TestValidator.predicate(
      `updated_at is ISO date-time for data source ${input.name}`,
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(
        createdDataSource.updated_at,
      ),
    );
  }

  // 5. Negative test: Attempt creating a data source with duplicate name
  await TestValidator.error("duplicate name fails", async () => {
    await api.functional.flexOffice.admin.dataSources.create(connection, {
      body: dataSourceInputs[0] satisfies IFlexOfficeDataSource.ICreate,
    });
  });

  // 6. Negative test: Attempt creating data source with invalid connection info
  const invalidInput = {
    name: `invalid-${RandomGenerator.alphaNumeric(6)}`,
    type: "mysql",
    connection_info: "{}", // empty JSON string, invalid connection info
    is_active: true,
    deleted_at: null,
  } satisfies IFlexOfficeDataSource.ICreate;

  await TestValidator.error("invalid connection_info fails", async () => {
    await api.functional.flexOffice.admin.dataSources.create(connection, {
      body: invalidInput,
    });
  });
}
