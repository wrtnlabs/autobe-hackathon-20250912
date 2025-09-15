import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotStockItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockItem";

/**
 * This E2E test function validates the creation of chatbot stock items by
 * an authorized admin user. It first registers and authenticates an admin
 * user, then creates a stock item with valid data. The test asserts that
 * the returned data matches expectations including correct UUID id, code,
 * name, and initial price. It also tests error handling for attempts to
 * create stock items with duplicate code or name, verifying uniqueness
 * constraints. The test ensures adherence to business rules and uses proper
 * async/await and type-safe assertions.
 *
 * Steps:
 *
 * 1. Admin registration and authentication.
 * 2. Successful creation of a stock item with unique code and name.
 * 3. Validation of response structure and fields.
 * 4. Error handling tests for duplicate code.
 * 5. Error handling tests for duplicate name.
 *
 * Business rules:
 *
 * - Stock item codes and names must be unique.
 * - Initial price must be within valid range.
 * - Only admins can create stock items.
 */
export async function test_api_chatbot_stock_item_creation_valid_data(
  connection: api.IConnection,
) {
  // 1. Admin user registration and authentication
  const adminCreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotAdmin.ICreate;
  const admin: IChatbotAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: adminCreateBody,
    },
  );
  typia.assert(admin);

  // 2. Create a chatbot stock item with unique code and name
  const stockItemCreateBody1 = {
    code: `STK${RandomGenerator.alphaNumeric(3).toUpperCase()}`,
    name: RandomGenerator.name(),
    initial_price: 500,
  } satisfies IChatbotStockItem.ICreate;
  const stockItem1: IChatbotStockItem =
    await api.functional.chatbot.admin.stockItems.createStockItem(connection, {
      body: stockItemCreateBody1,
    });
  typia.assert(stockItem1);

  // Validate returned fields
  TestValidator.predicate(
    "stock item id is uuid string",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      stockItem1.id,
    ),
  );
  TestValidator.equals(
    "stock item code matches",
    stockItem1.code,
    stockItemCreateBody1.code,
  );
  TestValidator.equals(
    "stock item name matches",
    stockItem1.name,
    stockItemCreateBody1.name,
  );
  TestValidator.equals(
    "stock item initial price matches",
    stockItem1.initial_price,
    stockItemCreateBody1.initial_price,
  );

  // 3. Attempt to create a stock item with duplicate code
  const stockItemCreateBody2 = {
    code: stockItemCreateBody1.code, // duplicate code
    name: RandomGenerator.name(),
    initial_price: 600,
  } satisfies IChatbotStockItem.ICreate;
  await TestValidator.error(
    "duplicate stock item code should fail",
    async () => {
      await api.functional.chatbot.admin.stockItems.createStockItem(
        connection,
        {
          body: stockItemCreateBody2,
        },
      );
    },
  );

  // 4. Attempt to create a stock item with duplicate name
  const stockItemCreateBody3 = {
    code: `STK${RandomGenerator.alphaNumeric(3).toUpperCase()}`,
    name: stockItemCreateBody1.name, // duplicate name
    initial_price: 700,
  } satisfies IChatbotStockItem.ICreate;
  await TestValidator.error(
    "duplicate stock item name should fail",
    async () => {
      await api.functional.chatbot.admin.stockItems.createStockItem(
        connection,
        {
          body: stockItemCreateBody3,
        },
      );
    },
  );
}
