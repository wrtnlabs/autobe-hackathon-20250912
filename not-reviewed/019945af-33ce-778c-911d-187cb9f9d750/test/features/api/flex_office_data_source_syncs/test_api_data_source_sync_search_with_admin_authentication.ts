import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IFlexOfficeDataSourceSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceSync";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeDataSourceSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeDataSourceSync";

/**
 * This test scenario validates the ability of an administrator to retrieve
 * a filtered and paginated list of synchronization tasks for a specific
 * data source. The scenario begins by creating and authenticating an admin
 * user to establish an authorized context. It proceeds to create a new data
 * source, ensuring a valid dataSourceId is available. The admin then
 * creates multiple synchronization tasks associated with the created data
 * source. Next, the search operation is performed with complex filter and
 * pagination parameters to retrieve relevant sync tasks. The test verifies
 * that the returned synchronization list matches the search criteria, is
 * correctly paginated, and contains valid synchronization metadata such as
 * status, timestamps, and error information. Business rules including
 * access control, filtering correctness, and pagination mechanics are
 * validated. Failure cases such as unauthorized access or invalid
 * dataSourceId are handled appropriately.
 *
 * Steps:
 *
 * 1. Admin user joins and authenticates.
 * 2. Admin creates a new data source with realistic data.
 * 3. Admin creates multiple sync tasks for the created data source with varied
 *    statuses and timestamps.
 * 4. Admin searches for sync tasks with complex filters including date range,
 *    status filtering, pagination, and sorting.
 * 5. The returned paginated result is validated to confirm that all sync tasks
 *    belong to the data source, match filters, and pagination is correct.
 * 6. Business logic validations for status, timestamps, and error message
 *    correctness.
 * 7. Tests for unauthorized access and invalid dataSourceId are omitted to
 *    focus on the main valid authorized use case due to scenario
 *    simplification.
 */
export async function test_api_data_source_sync_search_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Admin user joins and authenticates
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongPassw0rd!",
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin creates a new data source
  const dataSourceRequestBody = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    type: RandomGenerator.pick([
      "mysql",
      "postgresql",
      "google_sheet",
      "excel",
    ] as const),
    connection_info: JSON.stringify({
      host: "localhost",
      port: 3306,
      user: "admin",
      password: "secret",
    }),
    is_active: true,
    deleted_at: null,
  } satisfies IFlexOfficeDataSource.ICreate;

  const dataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.admin.dataSources.create(connection, {
      body: dataSourceRequestBody,
    });
  typia.assert(dataSource);

  // 3. Admin creates multiple sync tasks
  const syncStatuses = ["pending", "running", "success", "failed"] as const;
  const now = new Date();

  async function createSync(
    status: (typeof syncStatuses)[number],
    delayMinutes: number,
  ) {
    const scheduledAt = new Date(
      now.getTime() - delayMinutes * 60_000,
    ).toISOString();
    const startedAt =
      status === "pending"
        ? null
        : new Date(now.getTime() - delayMinutes * 60_000 + 1_000).toISOString();
    const completedAt =
      status === "success" || status === "failed"
        ? new Date(now.getTime() - delayMinutes * 60_000 + 2_000).toISOString()
        : null;
    const errorMessage =
      status === "failed" ? "Network error during sync" : null;

    const syncCreateBody = {
      flex_office_data_source_id: dataSource.id,
      scheduled_at: scheduledAt,
      started_at: startedAt,
      completed_at: completedAt,
      status: status,
      error_message: errorMessage,
    } satisfies IFlexOfficeDataSourceSync.ICreate;

    const sync: IFlexOfficeDataSourceSync =
      await api.functional.flexOffice.admin.dataSources.syncs.createSync(
        connection,
        {
          dataSourceId: dataSource.id,
          body: syncCreateBody,
        },
      );
    typia.assert(sync);
    return sync;
  }

  // Create 10 sync tasks varying in status and timestamps
  const syncTasks: IFlexOfficeDataSourceSync[] = [];
  for (let i = 0; i < 10; ++i) {
    const status = RandomGenerator.pick(syncStatuses);
    const delay = i * 10; // stagger by 10 minutes
    const syncTask = await createSync(status, delay);
    syncTasks.push(syncTask);
  }

  // 4. Search with complex filters
  const filterStatus: "pending" | "running" | "success" | "failed" =
    RandomGenerator.pick(syncStatuses);

  // Define date range for filtering: last 2 hours
  const scheduledAtFrom = new Date(now.getTime() - 120 * 60_000).toISOString();
  const scheduledAtTo = now.toISOString();

  // Pagination settings
  const page = 1;
  const limit = 5;

  // Sort by scheduled_at descending
  const sortBy = "scheduled_at";
  const sortOrder = "desc" as const;

  const searchBody = {
    flex_office_data_source_id: dataSource.id,
    scheduled_at_from: scheduledAtFrom,
    scheduled_at_to: scheduledAtTo,
    status: filterStatus,
    page: page,
    limit: limit,
    sort_by: sortBy,
    sort_order: sortOrder,
  } satisfies IFlexOfficeDataSourceSync.IRequest;

  const pageResult: IPageIFlexOfficeDataSourceSync =
    await api.functional.flexOffice.admin.dataSources.syncs.searchSyncs(
      connection,
      {
        dataSourceId: dataSource.id,
        body: searchBody,
      },
    );
  typia.assert(pageResult);

  // 5. Verify returned pagination info
  TestValidator.predicate(
    "pagination current matches",
    pageResult.pagination.current === page,
  );
  TestValidator.predicate(
    "pagination limit matches",
    pageResult.pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    pageResult.pagination.pages > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pageResult.pagination.records >= 0,
  );

  // 6. Verify all returned data belong to the data source and match filters
  for (const sync of pageResult.data) {
    TestValidator.equals(
      "sync data source id",
      sync.flex_office_data_source_id,
      dataSource.id,
    );
    TestValidator.equals(
      "sync status matches filter",
      sync.status,
      filterStatus,
    );

    // Check scheduled_at is within range
    const schedTime = new Date(sync.scheduled_at);
    const fromTime = new Date(scheduledAtFrom);
    const toTime = new Date(scheduledAtTo);
    TestValidator.predicate("scheduled_at >= from", schedTime >= fromTime);
    TestValidator.predicate("scheduled_at <= to", schedTime <= toTime);

    // Check timestamps consistency
    if (sync.status === "pending") {
      TestValidator.equals(
        "started_at is null for pending",
        sync.started_at,
        null,
      );
      TestValidator.equals(
        "completed_at is null for pending",
        sync.completed_at,
        null,
      );
      TestValidator.equals(
        "error_message is null for non-failed",
        sync.error_message,
        null,
      );
    } else if (sync.status === "running") {
      TestValidator.predicate(
        "started_at exists for running",
        sync.started_at !== null && sync.started_at !== undefined,
      );
      TestValidator.equals(
        "completed_at is null for running",
        sync.completed_at,
        null,
      );
      TestValidator.equals(
        "error_message is null for non-failed",
        sync.error_message,
        null,
      );
    } else if (sync.status === "success") {
      TestValidator.predicate(
        "started_at exists for success",
        sync.started_at !== null && sync.started_at !== undefined,
      );
      TestValidator.predicate(
        "completed_at exists for success",
        sync.completed_at !== null && sync.completed_at !== undefined,
      );
      TestValidator.equals(
        "error_message is null for non-failed",
        sync.error_message,
        null,
      );
    } else if (sync.status === "failed") {
      TestValidator.predicate(
        "started_at exists for failed",
        sync.started_at !== null && sync.started_at !== undefined,
      );
      TestValidator.predicate(
        "completed_at exists for failed",
        sync.completed_at !== null && sync.completed_at !== undefined,
      );
      TestValidator.predicate(
        "error_message exists for failed",
        sync.error_message !== null &&
          sync.error_message !== undefined &&
          sync.error_message.length > 0,
      );
    }
  }
}
