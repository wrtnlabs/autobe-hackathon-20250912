import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import type { IChatbotStockItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockItem";
import type { IChatbotStockTransactions } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockTransactions";

export async function test_api_stock_transaction_creation_by_member(
  connection: api.IConnection,
) {
  // 1. Member user joins via auth.member.join
  const memberJoinInput = {
    internal_sender_id: RandomGenerator.alphaNumeric(16),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;
  const memberAuthorized: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: memberJoinInput,
    });
  typia.assert(memberAuthorized);

  // 2. Authenticate member user by login to ensure session token is usable
  const memberLoginInput = {
    internal_sender_id: memberJoinInput.internal_sender_id,
    nickname: memberJoinInput.nickname,
  } satisfies IChatbotMember.ILogin;
  const memberLoginAuthorized: IChatbotMember.IAuthorized =
    await api.functional.auth.member.login.loginMember(connection, {
      body: memberLoginInput,
    });
  typia.assert(memberLoginAuthorized);

  // 3. Create chatbot member with the member authorized info
  // (simulate a separate member creation step as system user)
  const chatbotMemberInput = {
    internal_sender_id: memberJoinInput.internal_sender_id,
    nickname: memberJoinInput.nickname,
  } satisfies IChatbotMember.ICreate;
  const chatbotMember: IChatbotMember =
    await api.functional.chatbot.member.chatbotMembers.create(connection, {
      body: chatbotMemberInput,
    });
  typia.assert(chatbotMember);
  TestValidator.equals(
    "chatbot member internal_sender_id equals input",
    chatbotMember.internal_sender_id,
    chatbotMemberInput.internal_sender_id,
  );
  TestValidator.equals(
    "chatbot member nickname equals input",
    chatbotMember.nickname,
    chatbotMemberInput.nickname,
  );

  // 4. Admin user joins
  const adminJoinInput = {
    internal_sender_id: RandomGenerator.alphaNumeric(16),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotAdmin.ICreate;
  const adminAuthorized: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  // 5. Admin login
  const adminLoginInput = {
    internal_sender_id: adminJoinInput.internal_sender_id,
    nickname: adminJoinInput.nickname,
  } satisfies IChatbotAdmin.ILogin;
  const adminLoginAuthorized: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginInput,
    });
  typia.assert(adminLoginAuthorized);

  // 6. Switch connection context to admin by login for stock item creation
  await api.functional.auth.admin.login(connection, {
    body: adminLoginInput,
  });

  // 7. Create a chatbot stock item as admin
  const stockItemInput = {
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    name: RandomGenerator.name(2),
    initial_price: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number as number,
  } satisfies IChatbotStockItem.ICreate;

  const stockItem: IChatbotStockItem =
    await api.functional.chatbot.admin.stockItems.createStockItem(connection, {
      body: stockItemInput,
    });
  typia.assert(stockItem);

  // 8. Switch back to member login for transaction creation
  await api.functional.auth.member.login.loginMember(connection, {
    body: memberLoginInput,
  });

  // 9. Create a stock transaction for the member
  const quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >() satisfies number as number;
  const pricePerUnit = stockItem.initial_price;
  const transactionFee = Math.floor(pricePerUnit * quantity * 0.01) || 1;
  const totalPrice = pricePerUnit * quantity + transactionFee;

  const stockTransactionInput = {
    user_id: chatbotMember.id,
    stock_item_id: stockItem.id,
    transaction_type: RandomGenerator.pick(["buy", "sell"] as const),
    quantity: quantity,
    price_per_unit: pricePerUnit,
    transaction_fee: transactionFee,
    total_price: totalPrice,
  } satisfies IChatbotStockTransactions.ICreate;

  const transaction: IChatbotStockTransactions =
    await api.functional.chatbot.member.chatbotMembers.stockTransactions.create(
      connection,
      {
        memberId: chatbotMember.id,
        body: stockTransactionInput,
      },
    );
  typia.assert(transaction);

  TestValidator.equals(
    "transaction user_id matches chatbot member id",
    transaction.user_id,
    chatbotMember.id,
  );
  TestValidator.equals(
    "transaction stock_item_id matches created stock item id",
    transaction.stock_item_id,
    stockItem.id,
  );
  TestValidator.equals(
    "transaction quantity is positive",
    true,
    transaction.quantity > 0,
  );
  TestValidator.equals(
    "transaction price_per_unit matches stock item price",
    transaction.price_per_unit,
    stockItem.initial_price,
  );
  TestValidator.equals(
    "transaction total_price equals quantity * price_per_unit + transaction_fee",
    transaction.total_price,
    transaction.quantity * transaction.price_per_unit +
      transaction.transaction_fee,
  );

  // 10. Attempt invalid transaction with non-existent stock item
  await TestValidator.error(
    "should reject transaction with invalid stock_item_id",
    async () => {
      await api.functional.chatbot.member.chatbotMembers.stockTransactions.create(
        connection,
        {
          memberId: chatbotMember.id,
          body: {
            user_id: chatbotMember.id,
            stock_item_id: typia.random<string & tags.Format<"uuid">>(), // random UUID not existing
            transaction_type: "buy",
            quantity: 1,
            price_per_unit: 1,
            transaction_fee: 1,
            total_price: 2,
          } satisfies IChatbotStockTransactions.ICreate,
        },
      );
    },
  );

  // 11. Attempt invalid transaction with zero quantity
  await TestValidator.error(
    "should reject transaction with zero quantity",
    async () => {
      await api.functional.chatbot.member.chatbotMembers.stockTransactions.create(
        connection,
        {
          memberId: chatbotMember.id,
          body: {
            user_id: chatbotMember.id,
            stock_item_id: stockItem.id,
            transaction_type: "buy",
            quantity: 0,
            price_per_unit: stockItem.initial_price,
            transaction_fee: 0,
            total_price: 0,
          } satisfies IChatbotStockTransactions.ICreate,
        },
      );
    },
  );
}
