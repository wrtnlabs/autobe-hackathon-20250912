import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IFlexOfficeDataSourceCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceCredential";

export async function test_api_data_source_credential_update_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IFlexOfficeAdmin.ICreate;
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Log in as the registered admin
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IFlexOfficeAdmin.ILogin;
  const admin2: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(admin2);

  // 3. Create a new data source
  const dataSourceCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    type: RandomGenerator.pick([
      "mysql",
      "postgresql",
      "google_sheet",
      "excel",
    ] as const),
    connection_info: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 15,
    }),
    is_active: true,
    deleted_at: null,
  } satisfies IFlexOfficeDataSource.ICreate;
  const dataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.admin.dataSources.create(connection, {
      body: dataSourceCreateBody,
    });
  typia.assert(dataSource);

  // 4. Create a new credential under the created data source
  const credentialCreateBody = {
    flex_office_data_source_id: dataSource.id,
    credential_type: RandomGenerator.pick(["oauth2", "api_key"] as const),
    credential_value: RandomGenerator.alphaNumeric(32),
    expires_at: new Date(Date.now() + 86400000).toISOString(), // 1 day future
  } satisfies IFlexOfficeDataSourceCredential.ICreate;
  const credential: IFlexOfficeDataSourceCredential =
    await api.functional.flexOffice.admin.dataSources.credentials.create(
      connection,
      {
        dataSourceId: dataSource.id,
        body: credentialCreateBody,
      },
    );
  typia.assert(credential);

  // 5. Update the created credential with new valid data
  const credentialUpdateBody = {
    credential_type: RandomGenerator.pick(["oauth2", "api_key"] as const),
    credential_value: RandomGenerator.alphaNumeric(40),
    expires_at: new Date(Date.now() + 172800000).toISOString(), // 2 days future
  } satisfies IFlexOfficeDataSourceCredential.IUpdate;
  const updatedCredential: IFlexOfficeDataSourceCredential =
    await api.functional.flexOffice.admin.dataSources.credentials.updateCredential(
      connection,
      {
        dataSourceId: dataSource.id,
        credentialId: credential.id,
        body: credentialUpdateBody,
      },
    );
  typia.assert(updatedCredential);

  // 6. Validate that updated credential fields match the update request
  TestValidator.equals(
    "credential type updated",
    updatedCredential.credential_type,
    credentialUpdateBody.credential_type,
  );
  TestValidator.equals(
    "credential value updated",
    updatedCredential.credential_value,
    credentialUpdateBody.credential_value,
  );
  TestValidator.equals(
    "credential expiration updated",
    updatedCredential.expires_at,
    credentialUpdateBody.expires_at,
  );
}
