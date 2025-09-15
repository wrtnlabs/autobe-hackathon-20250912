import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotStockItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockItem";

export async function test_api_chatbot_stock_item_deletion_valid_id(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin
  const adminLike: IChatbotAdmin.ICreate = {
    internal_sender_id: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(),
  };
  const admin: IChatbotAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    { body: adminLike },
  );
  typia.assert(admin);

  // 2. Create chatbot stock item
  const createBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    initial_price: typia.random<number & tags.Type<"int32">>(),
  } satisfies IChatbotStockItem.ICreate;

  const stockItem: IChatbotStockItem =
    await api.functional.chatbot.admin.stockItems.createStockItem(connection, {
      body: createBody,
    });
  typia.assert(stockItem);

  // 3. Delete the created stock item
  await api.functional.chatbot.admin.stockItems.eraseStockItem(connection, {
    stockItemId: stockItem.id,
  });

  // 4. Attempt to delete again should throw error
  await TestValidator.error(
    "deletion of non-existent stock item throws error",
    async () => {
      await api.functional.chatbot.admin.stockItems.eraseStockItem(connection, {
        stockItemId: stockItem.id,
      });
    },
  );
}
