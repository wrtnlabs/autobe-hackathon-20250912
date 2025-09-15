import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IFlexOfficeDataSourceCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceCredential";

/**
 * This E2E test verifies the complete process of creating a new data source
 * credential under a specific data source with admin authorization.
 *
 * The test includes the following steps:
 *
 * 1. Register a new admin user with a unique email and password and validate
 *    the authorization.
 * 2. Log in as the registered admin user and validate the returned tokens.
 * 3. Create a new data source with realistic values for name, type,
 *    connection_info, is_active, and explicit null for deleted_at.
 * 4. Create a new credential for the created data source specifying
 *    credential_type, credential_value, and expires_at.
 * 5. Assert the expected results at each step using typia.assert.
 */
export async function test_api_data_source_credential_creation_success(
  connection: api.IConnection,
) {
  // 1. Register and join admin user
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassword123!",
  } satisfies IFlexOfficeAdmin.ICreate;

  const createdAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(createdAdmin);

  // 2. Login admin user
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IFlexOfficeAdmin.ILogin;

  const loggedInAdmin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // 3. Create new data source
  const dataSourceCreateBody = {
    name: `Test DataSource ${RandomGenerator.alphaNumeric(5)}`,
    type: RandomGenerator.pick([
      "mysql",
      "postgresql",
      "google_sheet",
      "excel",
    ] as const),
    connection_info:
      "Host=127.0.0.1;Port=5432;User=admin;Password=pass;Database=test;",
    is_active: true,
    deleted_at: null,
  } satisfies IFlexOfficeDataSource.ICreate;

  const createdDataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.admin.dataSources.create(connection, {
      body: dataSourceCreateBody,
    });
  typia.assert(createdDataSource);

  // 4. Create credential for data source
  const credentialCreateBody = {
    flex_office_data_source_id: createdDataSource.id,
    credential_type: RandomGenerator.pick(["oauth2", "api_key"] as const),
    credential_value: RandomGenerator.alphaNumeric(32),
    expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
  } satisfies IFlexOfficeDataSourceCredential.ICreate;

  const createdCredential: IFlexOfficeDataSourceCredential =
    await api.functional.flexOffice.admin.dataSources.credentials.create(
      connection,
      {
        dataSourceId: createdDataSource.id,
        body: credentialCreateBody,
      },
    );
  typia.assert(createdCredential);
}
