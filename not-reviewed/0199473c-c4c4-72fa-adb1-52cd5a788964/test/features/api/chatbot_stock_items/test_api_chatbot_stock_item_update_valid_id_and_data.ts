import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotStockItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockItem";
import type { IChatbotStockItems } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockItems";

/**
 * Tests updating a chatbot stock item using valid data.
 *
 * This test covers:
 *
 * 1. Admin user registration and authentication.
 * 2. Creating a stock item with initial valid data.
 * 3. Updating the created stock item with new unique code, name, and initial
 *    price.
 * 4. Verifying the update was persisted correctly and immutable fields remain
 *    unchanged.
 * 5. Negative tests for updating with invalid stockItemId and duplicate code
 *    or name.
 *
 * Verifies all business rules are respected and errors are handled
 * properly.
 */
export async function test_api_chatbot_stock_item_update_valid_id_and_data(
  connection: api.IConnection,
) {
  // Step 1: Admin registration and authentication
  const adminCreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotAdmin.ICreate;
  const admin: IChatbotAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    { body: adminCreateBody },
  );
  typia.assert(admin);

  // Step 2: Create a chatbot stock item with initial data
  const initialStockItemBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    initial_price: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1000000>
    >(),
  } satisfies IChatbotStockItem.ICreate;
  const createdStockItem: IChatbotStockItem =
    await api.functional.chatbot.admin.stockItems.createStockItem(connection, {
      body: initialStockItemBody,
    });
  typia.assert(createdStockItem);

  // Step 3: Update the stock item with new values
  // Ensure new code and name are different from original
  let newCode: string;
  do {
    newCode = RandomGenerator.alphaNumeric(8);
  } while (newCode === createdStockItem.code);

  let newName: string;
  do {
    newName = RandomGenerator.name(2);
  } while (newName === createdStockItem.name);

  const newInitialPrice = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1000000>
  >();

  const updateBody = {
    id: createdStockItem.id,
    code: newCode,
    name: newName,
    initial_price: newInitialPrice,
  } satisfies IChatbotStockItems.IUpdate;

  const updatedStockItem: IChatbotStockItems =
    await api.functional.chatbot.admin.stockItems.updateStockItem(connection, {
      stockItemId: createdStockItem.id,
      body: updateBody,
    });
  typia.assert(updatedStockItem);

  // Step 4: Verify updated stock item persisted
  TestValidator.equals(
    "stock item id remains same after update",
    updatedStockItem.id,
    createdStockItem.id,
  );
  TestValidator.equals(
    "stock item code updated",
    updatedStockItem.code,
    updateBody.code,
  );
  TestValidator.equals(
    "stock item name updated",
    updatedStockItem.name,
    updateBody.name,
  );
  TestValidator.equals(
    "stock item initial price updated",
    updatedStockItem.initial_price,
    updateBody.initial_price,
  );

  // Step 5a: Negative case - update with invalid stockItemId should fail
  await TestValidator.error(
    "update with non-existent stockItemId throws error",
    async () => {
      const fakeId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.chatbot.admin.stockItems.updateStockItem(
        connection,
        {
          stockItemId: fakeId,
          body: {
            id: fakeId,
            code: RandomGenerator.alphaNumeric(8),
            name: RandomGenerator.name(2),
            initial_price: 200,
          } satisfies IChatbotStockItems.IUpdate,
        },
      );
    },
  );

  // Step 5b: Negative case - update with duplicate code should fail
  // Create another stock item to have a duplicate code
  const anotherStockItemBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    initial_price: 300,
  } satisfies IChatbotStockItem.ICreate;
  const anotherStockItem: IChatbotStockItem =
    await api.functional.chatbot.admin.stockItems.createStockItem(connection, {
      body: anotherStockItemBody,
    });
  typia.assert(anotherStockItem);

  await TestValidator.error(
    "update stock item with duplicate code throws error",
    async () => {
      const duplicateCodeBody = {
        id: createdStockItem.id,
        code: anotherStockItem.code, // duplicate code
        name: newName,
        initial_price: newInitialPrice,
      } satisfies IChatbotStockItems.IUpdate;
      await api.functional.chatbot.admin.stockItems.updateStockItem(
        connection,
        {
          stockItemId: createdStockItem.id,
          body: duplicateCodeBody,
        },
      );
    },
  );

  // Step 5c: Negative case - update with duplicate name should fail
  await TestValidator.error(
    "update stock item with duplicate name throws error",
    async () => {
      const duplicateNameBody = {
        id: createdStockItem.id,
        code: newCode,
        name: anotherStockItem.name, // duplicate name
        initial_price: newInitialPrice,
      } satisfies IChatbotStockItems.IUpdate;
      await api.functional.chatbot.admin.stockItems.updateStockItem(
        connection,
        {
          stockItemId: createdStockItem.id,
          body: duplicateNameBody,
        },
      );
    },
  );
}
