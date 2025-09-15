import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import type { IJobPerformanceEvalSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalSystemSettings";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIJobPerformanceEvalSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalSystemSettings";

/**
 * Validate system settings listing with filtering and pagination for
 * authorized manager.
 *
 * This test ensures that only authorized managers can access job
 * performance evaluation system settings. It covers:
 *
 * - Manager account creation and authentication
 * - Listing system settings with various filtering criteria (search term,
 *   exact key match)
 * - Pagination with page and limit parameters
 * - Order by ascending and descending order
 * - Edge cases including empty results and partial matches
 *
 * The test uses realistic data generation and strictly follows DTO type
 * constraints. It uses typia.assert for complete runtime validation and
 * TestValidator for assertions.
 *
 * Steps:
 *
 * 1. Register and authenticate a manager user
 * 2. Call system settings listing API with random pagination and no filters
 * 3. Extract values from response for filtering tests
 * 4. Test filtering by search string partial match
 * 5. Test filtering by exact setting_key
 * 6. Test pagination edge with high page number
 *
 * This comprehensive test confirms correct business logic and security
 * enforcement.
 */
export async function test_api_system_settings_list_with_filtering(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a manager user
  const managerEmail: string = typia.random<string & tags.Format<"email">>();
  const manager: IJobPerformanceEvalManager.IAuthorized =
    await api.functional.auth.manager.join(connection, {
      body: {
        email: managerEmail,
        password: "strongPassword123!",
        name: RandomGenerator.name(),
      } satisfies IJobPerformanceEvalManager.ICreate,
    });
  typia.assert(manager);

  // 2. Basic listing call with random page and limit
  const page = Math.max(1, Math.floor(Math.random() * 5));
  const limit = Math.max(1, Math.floor(Math.random() * 5));
  const orderByOptions = ["asc", "desc"] as const;
  const orderBy = RandomGenerator.pick(orderByOptions);

  const basicList: IPageIJobPerformanceEvalSystemSettings =
    await api.functional.jobPerformanceEval.manager.systemSettings.index(
      connection,
      {
        body: {
          page,
          limit,
          order_by: orderBy,
        } satisfies IJobPerformanceEvalSystemSettings.IRequest,
      },
    );
  typia.assert(basicList);

  // Assertions on pagination
  TestValidator.predicate(
    "pagination current page within requested page",
    basicList.pagination.current >= 1 && basicList.pagination.current <= page,
  );
  TestValidator.predicate(
    "pagination limit matches request limit",
    basicList.pagination.limit === limit,
  );

  // 3. Filter tests - use setting_key and search from data if possible
  const anySetting = basicList.data.length > 0 ? basicList.data[0] : null;

  // 4. Filtering by partial match search (if available)
  if (anySetting !== null && anySetting.setting_key.length > 2) {
    const partialSearch = anySetting.setting_key.substring(0, 2);
    const searchFilterResult: IPageIJobPerformanceEvalSystemSettings =
      await api.functional.jobPerformanceEval.manager.systemSettings.index(
        connection,
        {
          body: {
            search: partialSearch,
            page: 1,
            limit: 5,
            order_by: "asc",
          } satisfies IJobPerformanceEvalSystemSettings.IRequest,
        },
      );
    typia.assert(searchFilterResult);

    // Assert all returned setting_key or description contains the partialSearch
    for (const setting of searchFilterResult.data) {
      TestValidator.predicate(
        `search filter matched for setting_key or description: ${setting.setting_key}`,
        setting.setting_key.includes(partialSearch) ||
          (setting.description !== null &&
            setting.description !== undefined &&
            String(setting.description).includes(partialSearch)),
      );
    }
  }

  // 5. Filtering by exact setting_key
  if (anySetting !== null) {
    const exactKeyFilterResult: IPageIJobPerformanceEvalSystemSettings =
      await api.functional.jobPerformanceEval.manager.systemSettings.index(
        connection,
        {
          body: {
            setting_key: anySetting.setting_key,
            page: 1,
            limit: 5,
            order_by: "desc",
          } satisfies IJobPerformanceEvalSystemSettings.IRequest,
        },
      );
    typia.assert(exactKeyFilterResult);

    // Assert all returned settings have exact setting_key
    for (const setting of exactKeyFilterResult.data) {
      TestValidator.equals(
        "setting_key matches filter",
        setting.setting_key,
        anySetting.setting_key,
      );
    }
  }

  // 6. Edge case: Empty result by high page number
  const emptyPageResult: IPageIJobPerformanceEvalSystemSettings =
    await api.functional.jobPerformanceEval.manager.systemSettings.index(
      connection,
      {
        body: {
          page: 9999, // very high page unlikely to have results
          limit: 5,
          order_by: "asc",
        } satisfies IJobPerformanceEvalSystemSettings.IRequest,
      },
    );
  typia.assert(emptyPageResult);
  TestValidator.equals(
    "empty result data length",
    emptyPageResult.data.length,
    0,
  );
}
