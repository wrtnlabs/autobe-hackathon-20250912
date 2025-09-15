import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IFlexOfficeDataSourceCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceCredential";

/**
 * Test scenario: This test validates the complete flow of an admin user
 * creating an account, authenticating, creating a data source, creating a
 * credential for that data source, deleting the credential, and verifying
 * deletion.
 *
 * It ensures proper authorization, entity creation, deletion, and validation
 * steps.
 */
export async function test_api_data_source_credential_delete_success(
  connection: api.IConnection,
) {
  // 1. Admin user joins (creates account)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // 2. Admin user logs in
  const adminLogin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ILogin,
    });
  typia.assert(adminLogin);

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
      wordMin: 3,
      wordMax: 6,
    }),
    is_active: true,
    deleted_at: null,
  } satisfies IFlexOfficeDataSource.ICreate;

  const dataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.admin.dataSources.create(connection, {
      body: dataSourceCreateBody,
    });
  typia.assert(dataSource);

  // 4. Create a credential for the created data source
  const credentialCreateBody = {
    flex_office_data_source_id: dataSource.id,
    credential_type: RandomGenerator.pick(["oauth2", "api_key"] as const),
    credential_value: RandomGenerator.alphaNumeric(20),
    expires_at: null,
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

  // 5. Delete the created credential
  await api.functional.flexOffice.admin.dataSources.credentials.eraseCredential(
    connection,
    {
      dataSourceId: dataSource.id,
      credentialId: credential.id,
    },
  );

  // 6. Subsequent attempt to delete the same credential should error
  await TestValidator.error(
    "deleting already erased credential should fail",
    async () => {
      await api.functional.flexOffice.admin.dataSources.credentials.eraseCredential(
        connection,
        {
          dataSourceId: dataSource.id,
          credentialId: credential.id,
        },
      );
    },
  );
}
