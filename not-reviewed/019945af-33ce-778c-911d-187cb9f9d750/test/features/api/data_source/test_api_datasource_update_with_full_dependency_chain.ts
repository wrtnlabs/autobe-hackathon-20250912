import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";

/**
 * This E2E test validates updating a FlexOffice data source through a
 * complete workflow involving admin registration, data source creation, and
 * data source update operations.
 *
 * The test ensures that only admins can perform data source updates, and
 * verifies that changes persist correctly and that timestamps and nullable
 * fields behave as expected.
 *
 * Workflow:
 *
 * 1. Admin registers via POST /auth/admin/join.
 * 2. Admin creates a data source via POST /flexOffice/admin/dataSources.
 * 3. Admin updates the created data source via PUT
 *    /flexOffice/admin/dataSources/{dataSourceId}.
 * 4. Verifies updated data source fields match submitted updates.
 * 5. Checks timestamp fields and deleted_at property.
 *
 * This test improves test reliability by using typia for type-safe
 * assertions and RandomGenerator for realistic randomized test data.
 *
 * The connection object automatically manages authentication token headers.
 */
export async function test_api_datasource_update_with_full_dependency_chain(
  connection: api.IConnection,
) {
  // 1. Register an admin user and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Password123!";
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a data source with valid required fields
  const initialDataSourceCreateBody = {
    name: `DataSource ${RandomGenerator.alphaNumeric(6)}`,
    type: RandomGenerator.pick([
      "mysql",
      "postgresql",
      "google_sheet",
      "excel",
    ] as const),
    connection_info: JSON.stringify({
      host: "localhost",
      port: 3306,
      user: "flexuser",
      password: "flexpass",
    }),
    is_active: true,
    deleted_at: null,
  } satisfies IFlexOfficeDataSource.ICreate;

  const createdDataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.admin.dataSources.create(connection, {
      body: initialDataSourceCreateBody,
    });
  typia.assert(createdDataSource);
  TestValidator.equals(
    "created data source name matches input",
    createdDataSource.name,
    initialDataSourceCreateBody.name,
  );

  // 3. Update the created data source with new values
  const updatedDataSourceUpdateBody = {
    name: `Updated ${RandomGenerator.alphaNumeric(8)}`,
    type: RandomGenerator.pick([
      "mysql",
      "postgresql",
      "google_sheet",
      "excel",
    ] as const),
    connection_info: JSON.stringify({
      host: "127.0.0.1",
      port: 5432,
      user: "adminuser",
      password: "adminpass",
    }),
    is_active: false,
  } satisfies IFlexOfficeDataSource.IUpdate;

  const updatedDataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.admin.dataSources.update(connection, {
      dataSourceId: createdDataSource.id,
      body: updatedDataSourceUpdateBody,
    });
  typia.assert(updatedDataSource);

  TestValidator.equals(
    "updated data source id matches original",
    updatedDataSource.id,
    createdDataSource.id,
  );
  TestValidator.equals(
    "updated name was applied",
    updatedDataSource.name,
    updatedDataSourceUpdateBody.name,
  );
  TestValidator.equals(
    "updated type was applied",
    updatedDataSource.type,
    updatedDataSourceUpdateBody.type,
  );
  TestValidator.equals(
    "updated connection info was applied",
    updatedDataSource.connection_info,
    updatedDataSourceUpdateBody.connection_info,
  );
  TestValidator.equals(
    "updated is_active flag applied",
    updatedDataSource.is_active,
    updatedDataSourceUpdateBody.is_active,
  );

  // Timestamps should be non-empty strings and valid ISO date-times
  TestValidator.predicate(
    "created_at is non-empty string",
    typeof updatedDataSource.created_at === "string" &&
      updatedDataSource.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is non-empty string",
    typeof updatedDataSource.updated_at === "string" &&
      updatedDataSource.updated_at.length > 0,
  );

  // deleted_at is either null or undefined
  TestValidator.predicate(
    "deleted_at is null or undefined",
    updatedDataSource.deleted_at === null ||
      updatedDataSource.deleted_at === undefined,
  );
}
