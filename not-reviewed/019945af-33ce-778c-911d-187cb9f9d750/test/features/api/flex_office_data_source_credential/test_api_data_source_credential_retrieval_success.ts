import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IFlexOfficeDataSourceCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceCredential";

/**
 * This test function validates the successful retrieval of a specific data
 * source credential within the FlexOffice admin system. The scenario
 * follows a comprehensive workflow that ensures authentication,
 * authorization, data creation, association, and retrieval work correctly.
 * It begins with creating and authenticating an admin user to establish a
 * valid admin session. Then, a new data source is created to serve as the
 * parent entity of credentials. After that, a new credential tied to the
 * created data source is added. The retrieval API for the specific
 * credential under that data source is then invoked using its ID to
 * validate correct return of credential data. The test includes multiple
 * verifications: it checks that the retrieved credential has the expected
 * properties, belongs to the correct data source, and that the API respects
 * authorization boundaries by testing forbidden access cases, such as
 * unauthorized connections or mismatched data source IDs. TypeScript type
 * safety is strictly enforced by using correct DTO variants for requests
 * and responses. Random but valid data generation is employed for entity
 * creation, while all required DTO properties are specified explicitly. JWT
 * authentication flows are verified by calling the admin join and login
 * endpoints sequentially. TestValidator checks validate successful
 * operations and expected failure modes, including 404 errors for
 * nonexistent credentials and forbidden errors for cross-data-source
 * credential retrieval attempts. All API calls are awaited and their
 * responses typia.asserted for perfect runtime type validation, ensuring
 * end-to-end correctness and reliability of this complex admin API
 * workflow.
 */
export async function test_api_data_source_credential_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Admin join (register new admin user)
  const adminCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "StrongPass123!",
  } satisfies IFlexOfficeAdmin.ICreate;
  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin login (authenticate existing admin user)
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IFlexOfficeAdmin.ILogin;
  const adminLoggedIn: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 3. Create a new data source
  const dataSourceCreateBody = {
    name: RandomGenerator.name(2),
    type: RandomGenerator.pick([
      "mysql",
      "postgresql",
      "google_sheet",
      "excel",
    ] as const),
    connection_info: RandomGenerator.alphaNumeric(15),
    is_active: true,
    deleted_at: null,
  } satisfies IFlexOfficeDataSource.ICreate;
  const createdDataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.admin.dataSources.create(connection, {
      body: dataSourceCreateBody,
    });
  typia.assert(createdDataSource);

  // 4. Create a new credential associated with the created data source
  const credentialCreateBody = {
    flex_office_data_source_id: createdDataSource.id,
    credential_type: RandomGenerator.pick(["oauth2", "api_key"] as const),
    credential_value: RandomGenerator.alphaNumeric(32),
    expires_at: null,
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

  // 5. Successfully retrieve the created credential
  const retrievedCredential: IFlexOfficeDataSourceCredential =
    await api.functional.flexOffice.admin.dataSources.credentials.at(
      connection,
      {
        dataSourceId: createdDataSource.id,
        credentialId: createdCredential.id,
      },
    );
  typia.assert(retrievedCredential);

  // Validate that the retrieved credential matches the one created
  TestValidator.equals(
    "credential id matches",
    retrievedCredential.id,
    createdCredential.id,
  );
  TestValidator.equals(
    "credential belongs to the correct data source",
    retrievedCredential.flex_office_data_source_id,
    createdDataSource.id,
  );
  TestValidator.equals(
    "credential type matches",
    retrievedCredential.credential_type,
    credentialCreateBody.credential_type,
  );
  TestValidator.equals(
    "credential value matches",
    retrievedCredential.credential_value,
    credentialCreateBody.credential_value,
  );

  // 6. Test failure cases

  // Attempt retrieval without admin context - create unauthenticated connection
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized retrieval should fail", async () => {
    await api.functional.flexOffice.admin.dataSources.credentials.at(
      unauthConnection,
      {
        dataSourceId: createdDataSource.id,
        credentialId: createdCredential.id,
      },
    );
  });

  // Attempt retrieval with non-existent credentialId should result in error
  await TestValidator.error(
    "retrieval of non-existent credential should fail",
    async () => {
      await api.functional.flexOffice.admin.dataSources.credentials.at(
        connection,
        {
          dataSourceId: createdDataSource.id,
          credentialId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Attempt retrieval of credential with mismatching dataSourceId should fail
  // For this, create another data source
  const anotherDataSourceCreateBody = {
    name: RandomGenerator.name(2),
    type: RandomGenerator.pick([
      "mysql",
      "postgresql",
      "google_sheet",
      "excel",
    ] as const),
    connection_info: RandomGenerator.alphaNumeric(15),
    is_active: true,
    deleted_at: null,
  } satisfies IFlexOfficeDataSource.ICreate;
  const anotherDataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.admin.dataSources.create(connection, {
      body: anotherDataSourceCreateBody,
    });
  typia.assert(anotherDataSource);

  await TestValidator.error(
    "retrieval with mismatched dataSourceId should fail",
    async () => {
      await api.functional.flexOffice.admin.dataSources.credentials.at(
        connection,
        {
          dataSourceId: anotherDataSource.id, // different data source than credential's
          credentialId: createdCredential.id,
        },
      );
    },
  );
}
