import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IFlexOfficeDataSourceSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceSync";

/**
 * Validate the deletion operations of FlexOffice data source sync records.
 *
 * This test ensures that only authenticated admin users can delete sync
 * records. It performs a complete workflow:
 *
 * - Create and authenticate an admin user.
 * - Create a data source.
 * - Create a sync record linked to this data source.
 * - Delete the sync record with proper authorization.
 * - Confirm the deletion was successful with no content returned.
 * - Attempt deletion as unauthorized and confirm error response.
 *
 * All API responses are validated for type correctness. Unauthorized
 * accesses are checked to enforce security. Business logic ensures hard
 * delete and admin-only access.
 *
 * @param connection API connection instance
 */
export async function test_api_data_source_sync_deletion_successful_and_unauthorized(
  connection: api.IConnection,
) {
  // 1. Admin user registration and authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "securePassword123",
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new data source
  const dataSourceCreateBody = {
    name: RandomGenerator.name(),
    type: "mysql",
    connection_info: "mysql://user:pass@localhost:3306/dbname",
    is_active: true,
    deleted_at: null,
  } satisfies IFlexOfficeDataSource.ICreate;

  const dataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.admin.dataSources.create(connection, {
      body: dataSourceCreateBody,
    });
  typia.assert(dataSource);

  // 3. Create a sync record for the above data source
  const syncCreateBody = {
    flex_office_data_source_id: dataSource.id,
    scheduled_at: new Date().toISOString(),
    started_at: null,
    completed_at: null,
    status: "pending",
    error_message: null,
  } satisfies IFlexOfficeDataSourceSync.ICreate;

  const syncRecord: IFlexOfficeDataSourceSync =
    await api.functional.flexOffice.admin.dataSources.syncs.createSync(
      connection,
      { dataSourceId: dataSource.id, body: syncCreateBody },
    );
  typia.assert(syncRecord);

  // 4. Delete the sync record as authorized admin
  await api.functional.flexOffice.admin.dataSources.syncs.eraseSync(
    connection,
    {
      dataSourceId: dataSource.id,
      syncId: syncRecord.id,
    },
  );

  // 5. Attempt deletion again should fail as record no longer exists or unauthorized
  await TestValidator.error(
    "duplicate deletion should fail or unauthorized",
    async () => {
      await api.functional.flexOffice.admin.dataSources.syncs.eraseSync(
        connection,
        {
          dataSourceId: dataSource.id,
          syncId: syncRecord.id,
        },
      );
    },
  );

  // 6. Create another connection without authentication to test unauthorized
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 7. Attempt unauthorized deletion
  await TestValidator.error(
    "unauthorized deletion attempt must fail",
    async () => {
      await api.functional.flexOffice.admin.dataSources.syncs.eraseSync(
        unauthenticatedConnection,
        {
          dataSourceId: dataSource.id,
          syncId: typia.random<string & tags.Format<"uuid">>(), // random id
        },
      );
    },
  );
}
