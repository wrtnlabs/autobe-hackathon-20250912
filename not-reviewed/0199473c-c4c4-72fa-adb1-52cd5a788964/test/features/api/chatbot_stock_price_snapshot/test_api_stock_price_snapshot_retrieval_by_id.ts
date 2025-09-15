import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotStockItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockItem";
import type { IChatbotStockPriceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockPriceSnapshot";

/**
 * Validate the retrieval of a specific stock price snapshot by ID.
 *
 * This test validates the entire retrieval flow of immutable historical
 * stock price snapshot data by:
 *
 * 1. Creating and authenticating an admin user.
 * 2. Creating a stock item with price context.
 * 3. Attempting to retrieve a non-existent stock price snapshot by a generated
 *    ID, expecting an error.
 * 4. Testing error handling for invalid UUID format.
 *
 * Due to the lack of an API for creating snapshots, this test focuses on
 * error handling and access control of the snapshot retrieval endpoint.
 *
 * @param connection The connection instance for API calls.
 */
export async function test_api_stock_price_snapshot_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Admin signup and login
  const adminInternalSenderId = RandomGenerator.alphaNumeric(16);
  const adminNickname = RandomGenerator.name();
  const admin: IChatbotAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        internal_sender_id: adminInternalSenderId,
        nickname: adminNickname,
      } satisfies IChatbotAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 2. Create a stock item
  const stockItemCode = RandomGenerator.alphaNumeric(10);
  const stockItemName = RandomGenerator.name();
  const stockItemInitialPrice = typia.random<number & tags.Type<"int32">>();
  const stockItem: IChatbotStockItem =
    await api.functional.chatbot.admin.stockItems.createStockItem(connection, {
      body: {
        code: stockItemCode,
        name: stockItemName,
        initial_price: stockItemInitialPrice satisfies number as number,
      } satisfies IChatbotStockItem.ICreate,
    });
  typia.assert(stockItem);

  // 3. Attempt to retrieve the stock price snapshot by a non-existent id
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieve fails for non-existent snapshot ID",
    async () => {
      await api.functional.chatbot.stockPriceSnapshots.at(connection, {
        stockPriceSnapshotId: nonExistentSnapshotId,
      });
    },
  );

  // 4. Test retrieval with invalid UUID format
  await TestValidator.error(
    "retrieve fails for invalid UUID format",
    async () => {
      await api.functional.chatbot.stockPriceSnapshots.at(connection, {
        stockPriceSnapshotId: "invalid-uuid-format",
      });
    },
  );
}
