import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IFlexOfficeDataSourceCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceCredential";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";

/**
 * This test case validates the complete scenario where an editor user of
 * FlexOffice updates a credential for a data source.
 *
 * The test starts with creating an editor user account and logging in to
 * receive JWT tokens. Then, the editor creates a data source. Afterward, an
 * admin user creates a credential for the data source. The editor then updates
 * the credential details via the update API.
 *
 * The test verifies that the credential update is successful and reflected in
 * the returned data. It also includes assertions to validate the types of all
 * created entities.
 *
 * Role-based access control is checked by proper switching between editor and
 * admin accounts during operations.
 *
 * The test intentionally avoids invalid type tests and relies strictly on valid
 * DTOs and API functions.
 *
 * Steps:
 *
 * 1. Register and login as editor.
 * 2. Register and login as admin.
 * 3. Editor creates a data source.
 * 4. Admin creates a credential for that data source.
 * 5. Editor updates the credential.
 * 6. Validate updated credential.
 *
 * This test ensures editors can manage credentials they have access to and
 * verifies the update API functionality.
 */
export async function test_api_data_source_credential_update_by_editor_success(
  connection: api.IConnection,
) {
  // 1. Register and login as editor
  const editorEmail = typia.random<string & tags.Format<"email">>();
  const editorPassword = "securePassword123!";
  const editorJoinBody = {
    name: RandomGenerator.name(),
    email: editorEmail,
    password: editorPassword,
  } satisfies IFlexOfficeEditor.ICreate;
  const editorAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, { body: editorJoinBody });
  typia.assert(editorAuthorized);

  await api.functional.auth.editor.login(connection, {
    body: {
      email: editorEmail,
      password: editorPassword,
    } satisfies IFlexOfficeEditor.ILogin,
  });

  // 2. Register and login as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "secureAdminPassword123!";
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IFlexOfficeAdmin.ICreate;
  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuthorized);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IFlexOfficeAdmin.ILogin,
  });

  // 3. Editor creates a data source
  const dataSourceCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    type: RandomGenerator.pick([
      "mysql",
      "postgresql",
      "google_sheet",
      "excel",
    ] as const),
    connection_info:
      "endpoint=localhost;port=3306;database=test;user=root;password=pass;",
    is_active: true,
    deleted_at: null,
  } satisfies IFlexOfficeDataSource.ICreate;

  const dataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.editor.dataSources.create(connection, {
      body: dataSourceCreateBody,
    });
  typia.assert(dataSource);

  // 4. Admin creates a credential for that data source
  const credentialCreateBody = {
    flex_office_data_source_id: dataSource.id,
    credential_type: "oauth2",
    credential_value: RandomGenerator.alphaNumeric(32),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
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

  // Switch authentication to editor to update the credential
  await api.functional.auth.editor.login(connection, {
    body: {
      email: editorEmail,
      password: editorPassword,
    } satisfies IFlexOfficeEditor.ILogin,
  });

  // 5. Editor updates the credential
  const credentialUpdateBody = {
    credential_type: "api_key",
    credential_value: RandomGenerator.alphaNumeric(40),
    expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IFlexOfficeDataSourceCredential.IUpdate;

  const updatedCredential: IFlexOfficeDataSourceCredential =
    await api.functional.flexOffice.editor.dataSources.credentials.updateCredential(
      connection,
      {
        dataSourceId: dataSource.id,
        credentialId: credential.id,
        body: credentialUpdateBody,
      },
    );
  typia.assert(updatedCredential);

  // 6. Validate updated credential details
  TestValidator.equals(
    "credential id should remain the same",
    updatedCredential.id,
    credential.id,
  );
  TestValidator.equals(
    "credential dataSourceId should remain the same",
    updatedCredential.flex_office_data_source_id,
    credential.flex_office_data_source_id,
  );
  TestValidator.equals(
    "credential type should be updated",
    updatedCredential.credential_type,
    credentialUpdateBody.credential_type!, // non-null asserted to satisfy type
  );
  TestValidator.equals(
    "credential value should be updated",
    updatedCredential.credential_value,
    credentialUpdateBody.credential_value!,
  );
  TestValidator.equals(
    "credential expiration should be updated",
    updatedCredential.expires_at,
    credentialUpdateBody.expires_at!,
  );
}
