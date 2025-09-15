import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";

/**
 * End-to-end test for data source deletion with full admin authentication.
 *
 * Validates the complete admin flow for creating and deleting a data source.
 * Checks authorization, successful deletion, and error cases.
 */
export async function test_api_datasource_deletion_with_full_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPassword = "StrongPass123!";
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a data source
  const dataSourceCreateBody = {
    name: `DataSource_${RandomGenerator.alphaNumeric(8)}`,
    type: RandomGenerator.pick([
      "mysql",
      "postgresql",
      "google_sheet",
      "excel",
    ] as const),
    connection_info: `Connection info for data source ${RandomGenerator.alphaNumeric(12)}`,
    is_active: true,
    deleted_at: null,
  } satisfies IFlexOfficeDataSource.ICreate;

  const createdDataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.admin.dataSources.create(connection, {
      body: dataSourceCreateBody,
    });
  typia.assert(createdDataSource);

  TestValidator.equals(
    "created data source name matches",
    createdDataSource.name,
    dataSourceCreateBody.name,
  );

  // 3. Delete the created data source
  await api.functional.flexOffice.admin.dataSources.erase(connection, {
    dataSourceId: createdDataSource.id,
  });

  // 4. Attempt to delete the same data source again - expect error because it is already deleted
  await TestValidator.error(
    "deleting a non-existent data source should fail",
    async () => {
      await api.functional.flexOffice.admin.dataSources.erase(connection, {
        dataSourceId: createdDataSource.id,
      });
    },
  );

  // 5. Test unauthorized deletion by using unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {}, // empty headers to simulate no auth
  };

  await TestValidator.error(
    "unauthorized data source deletion should fail",
    async () => {
      await api.functional.flexOffice.admin.dataSources.erase(
        unauthenticatedConnection,
        {
          dataSourceId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 6. Test deletion with a random invalid UUID (likely non-existent data source)
  await TestValidator.error(
    "deletion with invalid/non-existent dataSourceId should fail",
    async () => {
      await api.functional.flexOffice.admin.dataSources.erase(connection, {
        dataSourceId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
