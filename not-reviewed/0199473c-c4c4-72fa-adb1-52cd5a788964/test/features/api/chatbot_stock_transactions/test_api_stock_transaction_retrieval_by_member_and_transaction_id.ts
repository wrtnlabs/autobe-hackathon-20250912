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
 * This E2E test function verifies the retrieval of a specific stock
 * transaction record belonging to a chatbot member. It performs the full
 * business flow that includes member authentication, chatbot member
 * creation, admin authentication, stock item creation, stock transaction
 * creation, and finally retrieval of the transaction by ID. The function
 * asserts that the obtained transaction matches what was created and tests
 * error handling for accessing invalid or unauthorized resource IDs.
 */
export async function test_api_stock_transaction_retrieval_by_member_and_transaction_id(
  connection: api.IConnection,
) {
  // 1. Create and authenticate member user via join endpoint
  const memberJoinBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;
  const memberAuthorized = await api.functional.auth.member.join.joinMember(
    connection,
    { body: memberJoinBody },
  );
  typia.assert(memberAuthorized);

  // 2. Create chatbot member entity
  const chatbotMemberBody = {
    internal_sender_id: memberAuthorized.internal_sender_id,
    nickname: memberAuthorized.nickname,
  } satisfies IChatbotMember.ICreate;
  const chatbotMember =
    await api.functional.chatbot.member.chatbotMembers.create(connection, {
      body: chatbotMemberBody,
    });
  typia.assert(chatbotMember);
  TestValidator.equals(
    "chatbot member id matches authorized",
    chatbotMember.id,
    memberAuthorized.id,
  );

  // 3. Authenticate admin using join endpoint
  const adminJoinBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotAdmin.ICreate;
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);

  // 4. Create stock item
  const stockItemBody = {
    code: RandomGenerator.alphaNumeric(6).toUpperCase(),
    name: RandomGenerator.name(),
    initial_price: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000000>
    >(),
  } satisfies IChatbotStockItem.ICreate;
  const stockItem =
    await api.functional.chatbot.admin.stockItems.createStockItem(connection, {
      body: stockItemBody,
    });
  typia.assert(stockItem);

  // 5. Create stock transaction for the chatbot member
  const stockTransactionBody = {
    user_id: chatbotMember.id,
    stock_item_id: stockItem.id,
    transaction_type: RandomGenerator.pick(["buy", "sell"] as const),
    quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
    >(),
    price_per_unit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000000>
    >(),
    transaction_fee: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<10000>
    >(),
    total_price: 0,
  } satisfies IChatbotStockTransactions.ICreate;
  // Calculate total_price as quantity * price_per_unit + transaction_fee
  const totalPrice =
    stockTransactionBody.quantity * stockTransactionBody.price_per_unit +
    stockTransactionBody.transaction_fee;
  const updatedStockTransactionBody = {
    ...stockTransactionBody,
    total_price: totalPrice,
  } satisfies IChatbotStockTransactions.ICreate;

  const stockTransaction =
    await api.functional.chatbot.member.chatbotMembers.stockTransactions.create(
      connection,
      {
        memberId: chatbotMember.id,
        body: updatedStockTransactionBody,
      },
    );
  typia.assert(stockTransaction);

  // Validate stock transaction fields
  TestValidator.equals(
    "stock transaction user_id matches member id",
    stockTransaction.user_id,
    chatbotMember.id,
  );
  TestValidator.equals(
    "stock transaction stock_item_id matches",
    stockTransaction.stock_item_id,
    stockItem.id,
  );
  TestValidator.equals(
    "stock transaction type matches",
    stockTransaction.transaction_type,
    updatedStockTransactionBody.transaction_type,
  );
  TestValidator.equals(
    "stock transaction quantity matches",
    stockTransaction.quantity,
    updatedStockTransactionBody.quantity,
  );
  TestValidator.equals(
    "stock transaction price_per_unit matches",
    stockTransaction.price_per_unit,
    updatedStockTransactionBody.price_per_unit,
  );
  TestValidator.equals(
    "stock transaction transaction_fee matches",
    stockTransaction.transaction_fee,
    updatedStockTransactionBody.transaction_fee,
  );
  TestValidator.equals(
    "stock transaction total_price matches",
    stockTransaction.total_price,
    updatedStockTransactionBody.total_price,
  );

  // 6. Retrieve the exact stock transaction by memberId and stockTransactionId
  const retrievedTransaction =
    await api.functional.chatbot.member.chatbotMembers.stockTransactions.at(
      connection,
      {
        memberId: chatbotMember.id,
        stockTransactionId: stockTransaction.id,
      },
    );
  typia.assert(retrievedTransaction);

  // Validate retrieved transaction matches exactly
  TestValidator.equals(
    "retrieved stock transaction matches created",
    retrievedTransaction,
    stockTransaction,
  );

  // 7. Test error handling: try to retrieve with invalid UUIDs
  await TestValidator.error(
    "retrieve with invalid memberId should fail",
    async () => {
      await api.functional.chatbot.member.chatbotMembers.stockTransactions.at(
        connection,
        {
          memberId: typia.random<string & tags.Format<"uuid">>(),
          stockTransactionId: stockTransaction.id,
        },
      );
    },
  );
  await TestValidator.error(
    "retrieve with invalid stockTransactionId should fail",
    async () => {
      await api.functional.chatbot.member.chatbotMembers.stockTransactions.at(
        connection,
        {
          memberId: chatbotMember.id,
          stockTransactionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
