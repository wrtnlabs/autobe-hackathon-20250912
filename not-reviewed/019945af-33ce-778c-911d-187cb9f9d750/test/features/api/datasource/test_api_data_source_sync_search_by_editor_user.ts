import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IFlexOfficeDataSourceSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceSync";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIFlexOfficeDataSourceSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIFlexOfficeDataSourceSync";

/**
 * This E2E test validates the editor user workflow to create and search
 * synchronization tasks for external data sources in FlexOffice system.
 *
 * The test covers editor user registration, external data source creation under
 * the editor's context, creation of multiple synchronization records for the
 * data source, executing search queries with filters and pagination, asserting
 * correctness of response including access control, response structure, and
 * data consistency.
 *
 * It also tests unauthorized access rejection and validates proper filtering
 * and sorting behavior.
 *
 * This thorough test ensures business rules, user permissions, and API
 * functionalities regarding data source synchronization management are
 * correctly implemented and enforced.
 */
export async function test_api_data_source_sync_search_by_editor_user(
  connection: api.IConnection,
) {
  // 1. Register editor user and authenticate
  const editorCreationBody = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IFlexOfficeEditor.ICreate;
  const editor: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreationBody,
    });
  typia.assert(editor);

  // 2. Create a new data source
  const dataSourceCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    type: RandomGenerator.pick([
      "mysql",
      "postgresql",
      "google_sheet",
      "excel",
    ] as const),
    connection_info: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 20,
      wordMax: 40,
    }),
    is_active: true,
    deleted_at: null,
  } satisfies IFlexOfficeDataSource.ICreate;
  const dataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.editor.dataSources.create(connection, {
      body: dataSourceCreateBody,
    });
  typia.assert(dataSource);

  // 3. Create multiple synchronization tasks
  const syncStatuses = ["pending", "running", "success", "failed"] as const;
  const now = new Date();
  const createdSyncs: IFlexOfficeDataSourceSync[] = [];
  const createSyncCount = 5;
  for (let i = 0; i < createSyncCount; i++) {
    const scheduledAt = new Date(now.getTime() + i * 3600000).toISOString();
    const status = RandomGenerator.pick(syncStatuses);
    const startedAt =
      status === "pending"
        ? null
        : new Date(now.getTime() + i * 3600000 + 600000).toISOString();
    const completedAt =
      status === "running" || status === "pending"
        ? null
        : new Date(now.getTime() + i * 3600000 + 1200000).toISOString();
    const errorMessage =
      status === "failed"
        ? RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 })
        : null;
    const syncCreateBody = {
      flex_office_data_source_id: dataSource.id,
      scheduled_at: scheduledAt,
      started_at: startedAt,
      completed_at: completedAt,
      status: status,
      error_message: errorMessage,
    } satisfies IFlexOfficeDataSourceSync.ICreate;
    const sync =
      await api.functional.flexOffice.editor.dataSources.syncs.createSync(
        connection,
        {
          dataSourceId: dataSource.id,
          body: syncCreateBody,
        },
      );
    typia.assert(sync);
    createdSyncs.push(sync);
  }

  // 4. Search synchronization tasks with filters, pagination, and sorting
  const filterBody = {
    flex_office_data_source_id: dataSource.id,
    scheduled_at_from: createdSyncs[0].scheduled_at,
    scheduled_at_to: createdSyncs[createdSyncs.length - 1].scheduled_at,
    status: null,
    page: 1,
    limit: 10,
    sort_by: "scheduled_at",
    sort_order: "asc",
  } satisfies IFlexOfficeDataSourceSync.IRequest;
  const searchResult: IPageIFlexOfficeDataSourceSync =
    await api.functional.flexOffice.editor.dataSources.syncs.searchSyncs(
      connection,
      {
        dataSourceId: dataSource.id,
        body: filterBody,
      },
    );
  typia.assert(searchResult);

  // Verify data consistencies and paging
  TestValidator.predicate("page data has correct dataSourceId", () =>
    searchResult.data.every(
      (sync) => sync.flex_office_data_source_id === dataSource.id,
    ),
  );
  TestValidator.predicate("page scheduled_at filter respected", () =>
    searchResult.data.every(
      (sync) =>
        sync.scheduled_at >= filterBody.scheduled_at_from! &&
        sync.scheduled_at <= filterBody.scheduled_at_to!,
    ),
  );
  TestValidator.predicate("page sorted ascending", () =>
    searchResult.data.every(
      (current, index, arr) =>
        index === 0 || arr[index - 1].scheduled_at <= current.scheduled_at,
    ),
  );
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "page limit respected",
    () => searchResult.data.length <= filterBody.limit!,
  );

  // 5. Test unauthorized search access
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized searchSyncs should fail",
    async () => {
      await api.functional.flexOffice.editor.dataSources.syncs.searchSyncs(
        unauthConnection,
        {
          dataSourceId: dataSource.id,
          body: filterBody,
        },
      );
    },
  );
}
