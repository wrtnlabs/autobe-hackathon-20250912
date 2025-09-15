import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotStockItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockItem";

/**
 * This E2E test validates the complete lifecycle of creating and retrieving a
 * chatbot stock item. It first creates an admin user required for admin
 * operations, then creates a stock item with valid required fields. It
 * retrieves the created stock item and asserts its properties match the
 * creation input. The test also performs negative retrieval attempts using
 * invalid IDs expecting failures.
 */
export async function test_api_chatbot_stock_item_retrieval_valid_id(
  connection: api.IConnection,
) {
  // 1. Admin user creation and authentication
  const adminCreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(16),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotAdmin.ICreate;

  const admin: IChatbotAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    { body: adminCreateBody },
  );
  typia.assert(admin);

  // 2. Prepare a unique stock item code
  const stockItemCode: string = RandomGenerator.alphaNumeric(8);

  // 3. Create chatbot stock item
  const createStockItemBody = {
    code: stockItemCode,
    name: RandomGenerator.name(),
    initial_price: typia.assert<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1000000>
    >(Math.floor(Math.random() * (1000000 - 100 + 1)) + 100),
  } satisfies IChatbotStockItem.ICreate;

  const createdStockItem: IChatbotStockItem =
    await api.functional.chatbot.admin.stockItems.createStockItem(connection, {
      body: createStockItemBody,
    });
  typia.assert(createdStockItem);

  // Validate created values against input
  TestValidator.equals(
    "stock item code matches",
    createdStockItem.code,
    createStockItemBody.code,
  );
  TestValidator.equals(
    "stock item name matches",
    createdStockItem.name,
    createStockItemBody.name,
  );
  TestValidator.equals(
    "stock item initial_price matches",
    createdStockItem.initial_price,
    createStockItemBody.initial_price,
  );

  // Validate timestamps existence
  TestValidator.predicate(
    "created_at is ISO 8601 string",
    typeof createdStockItem.created_at === "string" &&
      createdStockItem.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 string",
    typeof createdStockItem.updated_at === "string" &&
      createdStockItem.updated_at.length > 0,
  );

  // 4. Retrieve the stock item by stockItemId
  const stockItemId = createdStockItem.id;

  const retrievedStockItem: IChatbotStockItem =
    await api.functional.chatbot.stockItems.atStockItem(connection, {
      stockItemId,
    });
  typia.assert(retrievedStockItem);

  // Validate retrieved stock item matches created data
  TestValidator.equals(
    "retrieved id matches created",
    retrievedStockItem.id,
    stockItemId,
  );
  TestValidator.equals(
    "retrieved code matches created",
    retrievedStockItem.code,
    createdStockItem.code,
  );
  TestValidator.equals(
    "retrieved name matches created",
    retrievedStockItem.name,
    createdStockItem.name,
  );
  TestValidator.equals(
    "retrieved initial_price matches created",
    retrievedStockItem.initial_price,
    createdStockItem.initial_price,
  );

  TestValidator.equals(
    "retrieved created_at matches",
    retrievedStockItem.created_at,
    createdStockItem.created_at,
  );
  TestValidator.equals(
    "retrieved updated_at matches",
    retrievedStockItem.updated_at,
    createdStockItem.updated_at,
  );
  TestValidator.equals(
    "retrieved deleted_at matches",
    retrievedStockItem.deleted_at ?? null,
    createdStockItem.deleted_at ?? null,
  );

  // 5. Negative tests on retrieval with invalid and non-existent UUIDs
  // Using random invalid format string for invalid testing
  await TestValidator.error(
    "retrieval with invalid UUID should fail",
    async () => {
      await api.functional.chatbot.stockItems.atStockItem(connection, {
        stockItemId: "invalid-uuid-format",
      });
    },
  );

  // Using a valid UUID that likely does not exist
  const nonExistentUuid = "00000000-0000-0000-0000-000000000000" as string &
    tags.Format<"uuid">;

  await TestValidator.error(
    "retrieval with non-existent UUID should fail",
    async () => {
      await api.functional.chatbot.stockItems.atStockItem(connection, {
        stockItemId: nonExistentUuid,
      });
    },
  );
}
