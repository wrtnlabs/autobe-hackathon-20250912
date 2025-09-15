import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IChatbotStockPriceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockPriceSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIChatbotStockPriceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotStockPriceSnapshot";

/**
 * E2E test for stock price snapshots pagination and filtering.
 *
 * Validates the PATCH /chatbot/stockPriceSnapshots endpoint for:
 *
 * - Filtering by stock item ID
 * - Pagination metadata correctness
 * - Proper handling of edge cases such as no results
 */
export async function test_api_stock_price_snapshots_pagination_and_filtering(
  connection: api.IConnection,
) {
  // Attempt to obtain a real stock_item_id from recent data for filtering

  // Initial query without filter to get a stock_item_id
  const firstQuery: IPageIChatbotStockPriceSnapshot =
    await api.functional.chatbot.stockPriceSnapshots.index(connection, {
      body: {
        page: 1,
        limit: 5,
        sortBy: "snapshot_time",
        filterStockItemId: null,
        filterSnapshotTimeFrom: null,
        filterSnapshotTimeTo: null,
      } satisfies IChatbotStockPriceSnapshot.IRequest,
    });
  typia.assert(firstQuery);

  // Determine a stock_item_id to filter by; if no data, test empty response scenario
  if (firstQuery.data.length === 0) {
    // No data found at all, test empty result with a random UUID filter
    const emptyFilterBody = {
      page: 1,
      limit: 5,
      sortBy: "snapshot_time",
      filterStockItemId: typia.random<string & tags.Format<"uuid">>(),
      filterSnapshotTimeFrom: null,
      filterSnapshotTimeTo: null,
    } satisfies IChatbotStockPriceSnapshot.IRequest;

    const emptyResult = await api.functional.chatbot.stockPriceSnapshots.index(
      connection,
      { body: emptyFilterBody },
    );
    typia.assert(emptyResult);

    TestValidator.equals(
      "empty result data length is zero",
      emptyResult.data.length,
      0,
    );
    TestValidator.equals(
      "empty result pagination records is zero",
      emptyResult.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty result pagination pages is zero",
      emptyResult.pagination.pages,
      0,
    );

    return;
  }

  // Use the stock_item_id from the first record for filter testing
  const stockItemId = firstQuery.data[0].stock_item_id;

  // Perform multiple paginated queries with filtering by stock_item_id
  for (let page = 1; page <= 3; ++page) {
    const limit = RandomGenerator.pick([2, 3, 4, 5] as const);

    const requestBody = {
      page,
      limit,
      sortBy: "snapshot_time",
      filterStockItemId: stockItemId,
      filterSnapshotTimeFrom: null,
      filterSnapshotTimeTo: null,
    } satisfies IChatbotStockPriceSnapshot.IRequest;

    const response = await api.functional.chatbot.stockPriceSnapshots.index(
      connection,
      { body: requestBody },
    );

    typia.assert(response);

    // Verify that every returned snapshot matches the stock_item_id filter
    for (const snapshot of response.data) {
      TestValidator.equals(
        `snapshot stock_item_id matches filter on page ${page}`,
        snapshot.stock_item_id,
        stockItemId,
      );
    }

    // Validate pagination metadata respects business rules
    TestValidator.predicate(
      `pagination current page matches request on page ${page}`,
      response.pagination.current === page,
    );
    TestValidator.predicate(
      `pagination limit is less than or equal requested limit on page ${page}`,
      response.pagination.limit === limit,
    );
    TestValidator.predicate(
      `pagination records is non-negative on page ${page}`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `pagination pages is consistent with records and limit on page ${page}`,
      response.pagination.pages ===
        Math.ceil(response.pagination.records / response.pagination.limit),
    );

    // Validate count of returned data does not exceed limit
    TestValidator.predicate(
      `data length is not more than limit on page ${page}`,
      response.data.length <= limit,
    );

    // If not last page of data, data length should equal limit
    if (page < response.pagination.pages) {
      TestValidator.equals(
        `data length equals limit on non-last page ${page}`,
        response.data.length,
        limit,
      );
    }

    // If last page, data length can be less than or equal to limit
    if (page === response.pagination.pages) {
      TestValidator.predicate(
        `data length less or equal limit on last page ${page}`,
        response.data.length <= limit,
      );
    }

    // If page is beyond total pages, data length should be zero
    if (page > response.pagination.pages) {
      TestValidator.equals(
        `data length zero on page beyond total pages ${page}`,
        response.data.length,
        0,
      );
    }
  }
}
