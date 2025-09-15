import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";

/**
 * This test validates the successful retrieval of a FlexOffice data source
 * by an admin user.
 *
 * The test performs the following steps:
 *
 * 1. Creates a new admin user with a randomly generated email and a secure
 *    password.
 * 2. Logs in as that admin user to obtain authentication tokens.
 * 3. Fetches a data source by its UUID using the admin authorization.
 * 4. Validates that the retrieved data source details are correct and
 *    complete.
 *
 * This ensures that only authorized admins can access sensitive data source
 * information and verifies the operational correctness of the retrieval
 * API.
 */
export async function test_api_flexoffice_data_source_retrieval_as_admin_success(
  connection: api.IConnection,
) {
  // 1. Admin user creation
  const adminCreateBody = {
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "SecurePassword123!",
  } satisfies IFlexOfficeAdmin.ICreate;

  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin login to obtain tokens
  const adminLoginBody = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
  } satisfies IFlexOfficeAdmin.ILogin;

  const adminLoginAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 3. Retrieve data source info by id
  // Use a realistic UUID for dataSourceId
  const dataSourceId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const dataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.admin.dataSources.at(connection, {
      dataSourceId,
    });
  typia.assert(dataSource);

  // Validations
  TestValidator.equals(
    "dataSourceId matches requested",
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
    "connection_info is string",
    typeof dataSource.connection_info === "string",
  );
  TestValidator.predicate(
    "is_active is boolean",
    typeof dataSource.is_active === "boolean",
  );

  TestValidator.predicate(
    "created_at is valid ISO 8601 string",
    typeof dataSource.created_at === "string" &&
      !Number.isNaN(Date.parse(dataSource.created_at)),
  );

  TestValidator.predicate(
    "updated_at is valid ISO 8601 string",
    typeof dataSource.updated_at === "string" &&
      !Number.isNaN(Date.parse(dataSource.updated_at)),
  );

  // deleted_at can be null or string or undefined
  if (dataSource.deleted_at !== null && dataSource.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at, if present, is valid ISO 8601 string",
      typeof dataSource.deleted_at === "string" &&
        !Number.isNaN(Date.parse(dataSource.deleted_at)),
    );
  }
}
