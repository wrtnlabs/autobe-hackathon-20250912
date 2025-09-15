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
 * This E2E test validates the deletion of a data source credential by an editor
 * user to ensure correct authorization and resource cleanup. The workflow
 * involves multiple roles and includes comprehensive verification steps:
 *
 * 1. Register and authenticate an editor user.
 * 2. The editor creates a data source.
 * 3. Register and authenticate an admin user.
 * 4. The admin creates a credential linked to the editor's data source.
 * 5. Switch back to editor authentication.
 * 6. The editor deletes the credential.
 * 7. Confirm deletion by attempting to delete again and expecting error.
 *
 * Each API response is asserted for type safety with typia.assert.
 * Authentication tokens are managed implicitly by the SDK through login and
 * join operations.
 */
export async function test_api_data_source_credential_deletion_by_editor(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new editor user
  const editorCreate = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
  } satisfies IFlexOfficeEditor.ICreate;
  const editorAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreate,
    });
  typia.assert(editorAuthorized);

  // 2. Editor creates a new data source
  const dataSourceCreate = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    type: RandomGenerator.pick([
      "mysql",
      "postgresql",
      "google_sheet",
      "excel",
    ] as const),
    connection_info: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 4,
      wordMax: 8,
    }),
    is_active: true,
    deleted_at: null,
  } satisfies IFlexOfficeDataSource.ICreate;
  const dataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.editor.dataSources.create(connection, {
      body: dataSourceCreate,
    });
  typia.assert(dataSource);
  TestValidator.predicate(
    "dataSource id should be defined",
    dataSource.id.length > 0,
  );

  // 3. Register and authenticate a new admin user
  const adminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword123!",
  } satisfies IFlexOfficeAdmin.ICreate;
  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreate,
    });
  typia.assert(adminAuthorized);

  // 4. Admin login to refresh token into SDK handling
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminCreate.email,
      password: adminCreate.password,
    } satisfies IFlexOfficeAdmin.ILogin,
  });

  // 5. Admin creates a credential linked to the data source
  const credentialCreate = {
    flex_office_data_source_id: dataSource.id,
    credential_type: RandomGenerator.pick(["oauth2", "api_key"] as const),
    credential_value: RandomGenerator.alphaNumeric(24),
    expires_at: null,
  } satisfies IFlexOfficeDataSourceCredential.ICreate;
  const credential: IFlexOfficeDataSourceCredential =
    await api.functional.flexOffice.admin.dataSources.credentials.create(
      connection,
      {
        dataSourceId: dataSource.id,
        body: credentialCreate,
      },
    );
  typia.assert(credential);
  TestValidator.predicate(
    "credential id should be defined",
    credential.id.length > 0,
  );
  TestValidator.notEquals(
    "credential id should differ from data source id",
    credential.id,
    dataSource.id,
  );

  // 6. Switch back to editor login to perform deletion
  await api.functional.auth.editor.login(connection, {
    body: {
      email: editorCreate.email,
      password: editorCreate.password,
    } satisfies IFlexOfficeEditor.ILogin,
  });

  // 7. Editor deletes the credential
  await api.functional.flexOffice.editor.dataSources.credentials.eraseCredential(
    connection,
    {
      dataSourceId: dataSource.id,
      credentialId: credential.id,
    },
  );

  // 8. Attempt to delete the same credential again, expect an error
  await TestValidator.error(
    "deleted credential cannot be deleted again",
    async () => {
      await api.functional.flexOffice.editor.dataSources.credentials.eraseCredential(
        connection,
        {
          dataSourceId: dataSource.id,
          credentialId: credential.id,
        },
      );
    },
  );
}
