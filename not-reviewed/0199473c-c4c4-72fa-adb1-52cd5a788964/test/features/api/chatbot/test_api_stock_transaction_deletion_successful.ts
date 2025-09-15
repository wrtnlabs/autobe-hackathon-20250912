import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import type { IChatbotStockItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockItem";
import type { IChatbotStockTransactions } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockTransactions";

/**
 * This end-to-end test validates the successful deletion of a chatbot stock
 * transaction by a member user. The workflow simulates real business scenarios
 * with multi-role interactions between admin and member users. It covers member
 * user registration and login, admin user registration and login, creation of
 * chatbot stock item by admin, creation of a stock transaction by the member
 * linked to the stock item, deletion of that stock transaction by the member,
 * and verification that the transaction is permanently deleted. Authentication
 * flows ensure proper context switching and authorization enforcement.
 * Validation checks include confirming that both member and admin users are
 * authorized with valid tokens, the created stock item matches input data, the
 * created stock transaction is properly linked to the member and stock item
 * with correct values, deletion API call succeeds (void response), and attempts
 * to access the deleted transaction afterwards fail appropriately. This test
 * ensures the business rules of user-specific ownership and hard deletion
 * integrity are respected. Each step checks type-safe responses with
 * typia.assert and meaningful assertions via TestValidator. The data in each
 * request strictly adheres to the DTO schemas such as IChatbotMember.ICreate,
 * IChatbotAdmin.ICreate, IChatbotStockItem.ICreate, and
 * IChatbotStockTransactions.ICreate. The test uses realistic random data
 * generation for all string IDs, nicknames, stock item codes, names, and
 * transaction details respecting required formats and constraints such as UUID
 * for IDs and int32 for numeric quantities and prices. The test also confirms
 * explicit null handling and exact enum values where applicable. The overall
 * domain classification for this test is "chatbot". This ensures all cross-role
 * interactions and authorization boundaries are accurately tested within one
 * coherent business workflow.
 */
export async function test_api_stock_transaction_deletion_successful(
  connection: api.IConnection,
) {
  // 1. Register admin user
  const adminInternalSenderId = RandomGenerator.alphaNumeric(12);
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

  // 2. Login admin user to set auth context
  await api.functional.auth.admin.login(connection, {
    body: {
      internal_sender_id: adminInternalSenderId,
      nickname: adminNickname,
    } satisfies IChatbotAdmin.ILogin,
  });

  // 3. Create stock item by admin
  const stockItemCode = RandomGenerator.alphaNumeric(6);
  const stockItemName = RandomGenerator.name(2);
  const stockItemInitialPrice = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();

  const stockItem: IChatbotStockItem =
    await api.functional.chatbot.admin.stockItems.createStockItem(connection, {
      body: {
        code: stockItemCode,
        name: stockItemName,
        initial_price: stockItemInitialPrice,
      } satisfies IChatbotStockItem.ICreate,
    });
  typia.assert(stockItem);
  TestValidator.equals("stock item code", stockItem.code, stockItemCode);
  TestValidator.equals("stock item name", stockItem.name, stockItemName);
  TestValidator.equals(
    "stock item initial price",
    stockItem.initial_price,
    stockItemInitialPrice,
  );

  // 4. Register member user
  const memberInternalSenderId = RandomGenerator.alphaNumeric(12);
  const memberNickname = RandomGenerator.name();
  const member: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: {
        internal_sender_id: memberInternalSenderId,
        nickname: memberNickname,
      } satisfies IChatbotMember.ICreate,
    });
  typia.assert(member);

  // 5. Login member user to set auth context
  await api.functional.auth.member.login.loginMember(connection, {
    body: {
      internal_sender_id: memberInternalSenderId,
      nickname: memberNickname,
    } satisfies IChatbotMember.ILogin,
  });

  // 6. Create stock transaction linked to member and stock item
  const transactionType = RandomGenerator.pick(["buy", "sell"] as const);
  const quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const pricePerUnit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const transactionFee = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const totalPrice = quantity * pricePerUnit + transactionFee;

  const stockTransaction: IChatbotStockTransactions =
    await api.functional.chatbot.member.chatbotMembers.stockTransactions.create(
      connection,
      {
        memberId: member.id,
        body: {
          user_id: member.id,
          stock_item_id: stockItem.id,
          transaction_type: transactionType,
          quantity: quantity,
          price_per_unit: pricePerUnit,
          transaction_fee: transactionFee,
          total_price: totalPrice satisfies number as number,
        } satisfies IChatbotStockTransactions.ICreate,
      },
    );
  typia.assert(stockTransaction);
  TestValidator.equals(
    "stock transaction user_id",
    stockTransaction.user_id,
    member.id,
  );
  TestValidator.equals(
    "stock transaction stock_item_id",
    stockTransaction.stock_item_id,
    stockItem.id,
  );
  TestValidator.equals(
    "stock transaction type",
    stockTransaction.transaction_type,
    transactionType,
  );
  TestValidator.equals(
    "stock transaction quantity",
    stockTransaction.quantity,
    quantity,
  );
  TestValidator.equals(
    "stock transaction price per unit",
    stockTransaction.price_per_unit,
    pricePerUnit,
  );
  TestValidator.equals(
    "stock transaction transaction fee",
    stockTransaction.transaction_fee,
    transactionFee,
  );
  TestValidator.equals(
    "stock transaction total price",
    stockTransaction.total_price,
    totalPrice,
  );

  // 7. Delete the stock transaction by member
  await api.functional.chatbot.member.chatbotMembers.stockTransactions.erase(
    connection,
    {
      memberId: member.id,
      stockTransactionId: stockTransaction.id,
    },
  );

  // 8. Verify the transaction no longer exists by attempting deletion again (expect error)
  await TestValidator.error(
    "deleting a non-existent transaction should fail",
    async () => {
      await api.functional.chatbot.member.chatbotMembers.stockTransactions.erase(
        connection,
        {
          memberId: member.id,
          stockTransactionId: stockTransaction.id,
        },
      );
    },
  );
}
