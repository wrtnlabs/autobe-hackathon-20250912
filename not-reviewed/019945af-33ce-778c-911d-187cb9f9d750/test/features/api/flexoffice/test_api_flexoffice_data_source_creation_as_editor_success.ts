import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";

/**
 * Tests the entire workflow of creating a new FlexOffice data source by an
 * editor user.
 *
 * This test verifies that an editor user can register, login, and use the
 * authentication tokens to create a new data source with valid properties.
 * It covers the successful path with realistic values that satisfy all
 * required properties and respects the API's authorization and validation
 * rules.
 *
 * Steps:
 *
 * 1. Register a new editor user with random name, email, and fixed password.
 * 2. Login as that editor user with the same credentials.
 * 3. Create a FlexOffice data source using the editor's authenticated
 *    connection with valid fields:
 *
 *    - Name: unique human-readable string
 *    - Type: a sample valid data source type (e.g., "mysql")
 *    - Connection_info: stringified JSON with realistic connection details
 *    - Is_active: true
 * 4. Assert the API returns a new FlexOfficeDataSource object with correct
 *    fields, UUID id, timestamps, and status.
 */
export async function test_api_flexoffice_data_source_creation_as_editor_success(
  connection: api.IConnection,
) {
  // 1. Register editor user
  const editorEmail = typia.random<string & tags.Format<"email">>();
  const editorName = RandomGenerator.name();
  const editorPassword = "StrongP@ssw0rd"; // fixed test password
  const authorizedEditor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: {
        email: editorEmail,
        name: editorName,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ICreate,
    });
  typia.assert(authorizedEditor);

  // 2. Login as editor user
  const loginResult: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, {
      body: {
        email: editorEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ILogin,
    });
  typia.assert(loginResult);

  // 3. Create FlexOffice data source
  const dataSourceName = `DataSource_${RandomGenerator.alphaNumeric(10)}`;
  const dataSourceType = "mysql"; // sample valid type

  // Example realistic connection info as a JSON string
  const connectionDetails = JSON.stringify({
    host: "127.0.0.1",
    port: 3306,
    database: "test_db",
    username: "test_user",
    password: "test_password",
  });

  const newDataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.editor.dataSources.create(connection, {
      body: {
        name: dataSourceName,
        type: dataSourceType,
        connection_info: connectionDetails,
        is_active: true,
      } satisfies IFlexOfficeDataSource.ICreate,
    });
  typia.assert(newDataSource);

  // 4. Validate response
  TestValidator.predicate(
    "id looks like uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      newDataSource.id,
    ),
  );
  TestValidator.equals("name matches", newDataSource.name, dataSourceName);
  TestValidator.equals("type matches", newDataSource.type, dataSourceType);
  TestValidator.equals(
    "connection_info matches",
    newDataSource.connection_info,
    connectionDetails,
  );
  TestValidator.equals("is_active is true", newDataSource.is_active, true);
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    !isNaN(Date.parse(newDataSource.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    !isNaN(Date.parse(newDataSource.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    newDataSource.deleted_at ?? null,
    null,
  );
}
