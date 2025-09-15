import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IFlexOfficeDataSourceSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceSync";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeDataSourceSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeDataSourceSync";

// Multi-step E2E test for data source syncs with editor user
export async function test_api_data_source_sync_search_with_editor_authentication(
  connection: api.IConnection,
) {
  // 1. Admin joins and logs in
  const adminJoinEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "password123";
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminJoinEmail,
        password: adminPassword,
      } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminJoinEmail,
      password: adminPassword,
    } satisfies IFlexOfficeAdmin.ILogin,
  });

  // 2. Editor joins and logs in
  const editorJoinEmail = typia.random<string & tags.Format<"email">>();
  const editorPassword = "editorPassword123";
  const editor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: {
        name: RandomGenerator.name(),
        email: editorJoinEmail,
        password: editorPassword,
      } satisfies IFlexOfficeEditor.ICreate,
    });
  typia.assert(editor);

  await api.functional.auth.editor.login(connection, {
    body: {
      email: editorJoinEmail,
      password: editorPassword,
    } satisfies IFlexOfficeEditor.ILogin,
  });

  // 3. Editor creates a new data source
  const dataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.editor.dataSources.create(connection, {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 9,
        }),
        type: RandomGenerator.pick([
          "mysql",
          "postgresql",
          "google_sheet",
          "excel",
        ] as const),
        connection_info: RandomGenerator.paragraph({
          sentences: 10,
          wordMin: 4,
          wordMax: 10,
        }),
        is_active: true,
        deleted_at: null,
      } satisfies IFlexOfficeDataSource.ICreate,
    });
  typia.assert(dataSource);

  // 4. Editor creates multiple synchronization tasks
  const statuses = ["pending", "running", "success", "failed"] as const;
  const now = new Date();

  const syncs: IFlexOfficeDataSourceSync[] = [];

  // Create at least 7 sync records with diverse statuses and times
  for (let i = 0; i < 7; i++) {
    const scheduledAt = new Date(now.getTime() + i * 3600 * 1000).toISOString();
    const status = RandomGenerator.pick(statuses);
    const startedAt =
      status === "pending"
        ? null
        : new Date(now.getTime() + i * 3600 * 1000 + 60000).toISOString();
    const completedAt =
      status === "running" || status === "pending"
        ? null
        : new Date(now.getTime() + i * 3600 * 1000 + 120000).toISOString();
    const errorMessage =
      status === "failed" ? "Simulated synchronization failure" : null;

    const sync: IFlexOfficeDataSourceSync =
      await api.functional.flexOffice.editor.dataSources.syncs.createSync(
        connection,
        {
          dataSourceId: dataSource.id,
          body: {
            flex_office_data_source_id: dataSource.id,
            scheduled_at: scheduledAt,
            started_at: startedAt,
            completed_at: completedAt,
            status: status,
            error_message: errorMessage,
          } satisfies IFlexOfficeDataSourceSync.ICreate,
        },
      );
    typia.assert(sync);
    syncs.push(sync);
  }

  // 5. Switch context to admin (necessary for admin search)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminJoinEmail,
      password: adminPassword,
    } satisfies IFlexOfficeAdmin.ILogin,
  });

  // 6. Admin searches for syncs filtered by status, paginated and sorted

  // Search filter: status filter set to "success"
  // Scheduled date range around now
  // Pagination: page 1, limit 3
  // Sort: scheduled_at descending

  const searchFilter: IFlexOfficeDataSourceSync.IRequest = {
    flex_office_data_source_id: dataSource.id,
    status: "success",
    scheduled_at_from: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
    scheduled_at_to: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(),
    page: 1,
    limit: 3,
    sort_by: "scheduled_at",
    sort_order: "desc",
  };

  const pageResult: IPageIFlexOfficeDataSourceSync =
    await api.functional.flexOffice.admin.dataSources.syncs.searchSyncs(
      connection,
      {
        dataSourceId: dataSource.id,
        body: searchFilter,
      },
    );
  typia.assert(pageResult);

  // 7. Validate that all returned syncs belong to the data source and have filtered status
  for (const sync of pageResult.data) {
    TestValidator.equals(
      "dataSourceId matches",
      sync.flex_office_data_source_id,
      dataSource.id,
    );
    TestValidator.equals("status matches filter", sync.status, "success");
  }

  // 8. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page",
    pageResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit",
    pageResult.pagination.limit === 3,
  );
  TestValidator.predicate(
    "pagination records matches total count",
    pageResult.pagination.records >= pageResult.data.length,
  );
  TestValidator.predicate("pagination pages computed correctly", () => {
    const pages = Math.ceil(
      pageResult.pagination.records / pageResult.pagination.limit,
    );
    return pages === pageResult.pagination.pages;
  });

  // 9. Validate sorting order desc by scheduled_at
  for (let i = 1; i < pageResult.data.length; ++i) {
    TestValidator.predicate(
      "sorting by scheduled_at desc",
      pageResult.data[i - 1].scheduled_at >= pageResult.data[i].scheduled_at,
    );
  }

  // 10. Test edge case - filter with status not present (e.g., 'failed') but no matching syncs
  const emptyFilter: IFlexOfficeDataSourceSync.IRequest = {
    flex_office_data_source_id: dataSource.id,
    status: "failed",
    scheduled_at_from: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(), // future, no records
    scheduled_at_to: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
    page: 1,
    limit: 3,
  };

  const emptyPage: IPageIFlexOfficeDataSourceSync =
    await api.functional.flexOffice.admin.dataSources.syncs.searchSyncs(
      connection,
      {
        dataSourceId: dataSource.id,
        body: emptyFilter,
      },
    );
  typia.assert(emptyPage);
  TestValidator.predicate(
    "empty results for non-existent filter",
    emptyPage.data.length === 0 && emptyPage.pagination.records === 0,
  );

  // 11. Test edge case - malformed filter: no status but range with no records
  const malformedFilter: IFlexOfficeDataSourceSync.IRequest = {
    flex_office_data_source_id: dataSource.id,
    scheduled_at_from: "invalid-date-time",
    scheduled_at_to: "invalid-date-time",
    page: 1,
    limit: 3,
  };

  await TestValidator.error("malformed filter should throw error", async () => {
    await api.functional.flexOffice.admin.dataSources.syncs.searchSyncs(
      connection,
      {
        dataSourceId: dataSource.id,
        body: malformedFilter,
      },
    );
  });
}
