import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IFlexOfficeDataSourceSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceSync";

/**
 * Test scenario: Update an existing data source synchronization record with
 * valid data.
 *
 * This E2E test covers the entire workflow:
 *
 * 1. Create and authenticate an admin user
 * 2. Create a new external data source with valid data
 * 3. Create a sync record for the data source
 * 4. Update the sync record with new valid information (status, timestamps, error
 *    message)
 * 5. Validate that the updated sync record reflects changes accurately
 * 6. Verify error handling for updates with invalid or non-existent syncId
 * 7. Verify authorization enforcement by attempting update operations without
 *    admin login
 *
 * Key validation points:
 *
 * - Ensure the updated sync fields match the input
 * - Confirm proper ISO 8601 date-time format
 * - Verify the status uses allowed values (per business description, e.g.,
 *   'pending', 'running', 'success', 'failed')
 * - Confirm 404 errors on non-existent IDs
 * - Confirm 401/403 errors on unauthorized access
 *
 * The test emphasizes business logic and API contract correctness, omitting
 * type errors or invalid payload tests.
 */
export async function test_api_data_source_sync_update_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongPassword123!",
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a valid data source
  const dataSourceCreateBody = {
    name: `DataSource-${RandomGenerator.alphaNumeric(8)}`,
    type: "mysql",
    connection_info: JSON.stringify({
      host: "127.0.0.1",
      port: 3306,
      database: "test_db",
      user: "test_user",
      password: "pwd123",
    }),
    is_active: true,
    deleted_at: null,
  } satisfies IFlexOfficeDataSource.ICreate;

  const dataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.admin.dataSources.create(connection, {
      body: dataSourceCreateBody,
    });
  typia.assert(dataSource);

  // 3. Create a sync record for the data source
  const now = new Date();
  const scheduledAt = now.toISOString();
  const syncCreateBody = {
    flex_office_data_source_id: dataSource.id,
    scheduled_at: scheduledAt,
    status: "pending",
    started_at: null,
    completed_at: null,
    error_message: null,
  } satisfies IFlexOfficeDataSourceSync.ICreate;

  const syncRecord: IFlexOfficeDataSourceSync =
    await api.functional.flexOffice.admin.dataSources.syncs.createSync(
      connection,
      {
        dataSourceId: dataSource.id,
        body: syncCreateBody,
      },
    );
  typia.assert(syncRecord);

  // 4. Update the sync record with valid update data
  // Prepare updated timestamps and new status
  const updatedScheduledAt = new Date(
    Date.now() + 1000 * 60 * 60,
  ).toISOString();
  const updatedStartedAt = new Date(Date.now() + 1000 * 60 * 10).toISOString();
  const updatedCompletedAt = new Date(
    Date.now() + 1000 * 60 * 55,
  ).toISOString();
  const updatedErrorMessage = null;
  const updatedStatus = "success";

  const updateBody = {
    scheduled_at: updatedScheduledAt,
    started_at: updatedStartedAt,
    completed_at: updatedCompletedAt,
    status: updatedStatus,
    error_message: updatedErrorMessage,
  } satisfies IFlexOfficeDataSourceSync.IUpdate;

  const updatedSyncRecord: IFlexOfficeDataSourceSync =
    await api.functional.flexOffice.admin.dataSources.syncs.updateSync(
      connection,
      {
        dataSourceId: dataSource.id,
        syncId: syncRecord.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSyncRecord);

  // 5. Validate that updated sync record matches the update data and previous required properties
  TestValidator.equals(
    "sync record id should remain unchanged",
    updatedSyncRecord.id,
    syncRecord.id,
  );
  TestValidator.equals(
    "sync record dataSourceId should remain unchanged",
    updatedSyncRecord.flex_office_data_source_id,
    dataSource.id,
  );
  TestValidator.equals(
    "sync record status updated",
    updatedSyncRecord.status,
    updatedStatus,
  );
  TestValidator.equals(
    "sync record scheduled_at updated",
    updatedSyncRecord.scheduled_at,
    updatedScheduledAt,
  );
  TestValidator.equals(
    "sync record started_at updated",
    updatedSyncRecord.started_at,
    updatedStartedAt,
  );
  TestValidator.equals(
    "sync record completed_at updated",
    updatedSyncRecord.completed_at,
    updatedCompletedAt,
  );
  TestValidator.equals(
    "sync record error_message updated",
    updatedSyncRecord.error_message,
    updatedErrorMessage,
  );

  // 6. Test updating non-existent sync record returns a not found error
  await TestValidator.error(
    "update non-existent sync record should fail",
    async () => {
      await api.functional.flexOffice.admin.dataSources.syncs.updateSync(
        connection,
        {
          dataSourceId: dataSource.id,
          syncId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );

  // 7. Test unauthorized access (no admin login) returns authentication error
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "update sync record without authentication should fail",
    async () => {
      await api.functional.flexOffice.admin.dataSources.syncs.updateSync(
        unauthConn,
        {
          dataSourceId: dataSource.id,
          syncId: syncRecord.id,
          body: updateBody,
        },
      );
    },
  );
}
