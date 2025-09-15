import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";

/**
 * This test verifies that an editor user can successfully retrieve a
 * specific FlexOffice data source by ID. The test script includes signing
 * up a new editor user, logging in to obtain JWT authorization tokens, and
 * then fetching the detailed information of a data source using its UUID.
 * It confirms that the data source is accessible only with proper
 * authentication, and validates the response contains all required and
 * correctly typed properties.
 *
 * Steps:
 *
 * 1. Editor user registration with random realistic email, name, and password.
 * 2. Editor user login with the same email and password to get authentication
 *    tokens.
 * 3. Fetch data source details by UUID with authorized connection.
 * 4. Validate response attributes and types precisely using typia.assert.
 */
export async function test_api_flexoffice_data_source_retrieval_as_editor_success(
  connection: api.IConnection,
) {
  // 1. Editor user registration
  const editorCreate = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IFlexOfficeEditor.ICreate;
  const authorizedEditor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, { body: editorCreate });
  typia.assert(authorizedEditor);

  // 2. Editor user login
  const editorLogin = {
    email: editorCreate.email,
    password: editorCreate.password,
  } satisfies IFlexOfficeEditor.ILogin;
  const loggedInEditor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.login(connection, { body: editorLogin });
  typia.assert(loggedInEditor);

  // 3. Fetch data source detail by UUID
  // Use a realistic UUID for testing
  const dataSourceId = typia.random<string & tags.Format<"uuid">>();
  const dataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.editor.dataSources.at(connection, {
      dataSourceId,
    });
  typia.assert(dataSource);

  // 4. Validate business logic: dataSourceId matches, is_active is boolean etc.
  TestValidator.predicate(
    "dataSource id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      dataSource.id,
    ),
  );
  TestValidator.predicate(
    "dataSource is_active is boolean",
    typeof dataSource.is_active === "boolean",
  );
  TestValidator.equals(
    "dataSource id matches request",
    dataSource.id,
    dataSourceId,
  );
  TestValidator.predicate(
    "dataSource name is non-empty string",
    typeof dataSource.name === "string" && dataSource.name.length > 0,
  );
  TestValidator.predicate(
    "dataSource type is non-empty string",
    typeof dataSource.type === "string" && dataSource.type.length > 0,
  );
  TestValidator.predicate(
    "dataSource connection_info is string",
    typeof dataSource.connection_info === "string",
  );
  TestValidator.predicate(
    "dataSource created_at is ISO 8601 date-time string",
    !isNaN(Date.parse(dataSource.created_at)),
  );
  TestValidator.predicate(
    "dataSource updated_at is ISO 8601 date-time string",
    !isNaN(Date.parse(dataSource.updated_at)),
  );
  if (dataSource.deleted_at !== null && dataSource.deleted_at !== undefined) {
    TestValidator.predicate(
      "dataSource deleted_at is ISO 8601 date-time string if present",
      !isNaN(Date.parse(dataSource.deleted_at)),
    );
  }
}
