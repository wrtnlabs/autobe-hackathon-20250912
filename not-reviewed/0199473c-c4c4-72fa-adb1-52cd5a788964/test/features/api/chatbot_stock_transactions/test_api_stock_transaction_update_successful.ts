import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import type { IChatbotStockItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockItem";
import type { IChatbotStockTransactions } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockTransactions";

export async function test_api_stock_transaction_update_successful(
  connection: api.IConnection,
) {
  // 1. Member registration
  const memberCreate = {
    internal_sender_id: RandomGenerator.alphaNumeric(16),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;
  const member: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: memberCreate,
    });
  typia.assert(member);

  // 2. Admin registration
  const adminCreate = {
    internal_sender_id: RandomGenerator.alphaNumeric(16),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotAdmin.ICreate;
  const admin: IChatbotAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    { body: adminCreate },
  );
  typia.assert(admin);

  // 3. Admin login
  const adminLoginBody = {
    internal_sender_id: admin.internal_sender_id,
    nickname: admin.nickname,
  } satisfies IChatbotAdmin.ILogin;
  const adminLoggedIn: IChatbotAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoggedIn);

  // 4. Admin creates stock item
  const stockItemCreate = {
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    name: RandomGenerator.name(2),
    initial_price: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
  } satisfies IChatbotStockItem.ICreate;
  const stockItem: IChatbotStockItem =
    await api.functional.chatbot.admin.stockItems.createStockItem(connection, {
      body: stockItemCreate,
    });
  typia.assert(stockItem);

  // 5. Member creates initial stock transaction
  const stockTransactionCreate = {
    user_id: member.id,
    stock_item_id: stockItem.id,
    transaction_type: "buy",
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    price_per_unit: stockItem.initial_price,
    transaction_fee: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
    >(),
    total_price: 0,
  } satisfies IChatbotStockTransactions.ICreate;
  const totalPrice =
    stockTransactionCreate.quantity * stockTransactionCreate.price_per_unit +
    stockTransactionCreate.transaction_fee;
  const stockTransactionCreateFinal = {
    ...stockTransactionCreate,
    total_price: totalPrice,
  } satisfies IChatbotStockTransactions.ICreate;
  const stockTransaction: IChatbotStockTransactions =
    await api.functional.chatbot.member.chatbotMembers.stockTransactions.create(
      connection,
      {
        memberId: member.id,
        body: stockTransactionCreateFinal,
      },
    );
  typia.assert(stockTransaction);

  // 6. Member updates the stock transaction
  const stockTransactionUpdateBody = {
    transaction_type: "sell",
    quantity: stockTransaction.quantity + 5,
    price_per_unit: stockTransaction.price_per_unit + 10,
    transaction_fee: stockTransaction.transaction_fee + 50,
    total_price: 0,
  } satisfies IChatbotStockTransactions.IUpdate;
  const totalPriceUpdate =
    stockTransactionUpdateBody.quantity! *
      stockTransactionUpdateBody.price_per_unit! +
    stockTransactionUpdateBody.transaction_fee!;
  const stockTransactionUpdateFinal = {
    ...stockTransactionUpdateBody,
    total_price: totalPriceUpdate,
  } satisfies IChatbotStockTransactions.IUpdate;

  const updatedStockTransaction: IChatbotStockTransactions =
    await api.functional.chatbot.member.chatbotMembers.stockTransactions.update(
      connection,
      {
        memberId: member.id,
        stockTransactionId: stockTransaction.id,
        body: stockTransactionUpdateFinal,
      },
    );
  typia.assert(updatedStockTransaction);

  // 7. Validation
  TestValidator.equals(
    "member ID matches",
    updatedStockTransaction.user_id,
    member.id,
  );
  TestValidator.equals(
    "stock item ID matches",
    updatedStockTransaction.stock_item_id,
    stockItem.id,
  );
  TestValidator.equals(
    "transaction type updated",
    updatedStockTransaction.transaction_type,
    "sell",
  );
  TestValidator.equals(
    "quantity updated",
    updatedStockTransaction.quantity,
    stockTransactionUpdateBody.quantity,
  );
  TestValidator.equals(
    "price per unit updated",
    updatedStockTransaction.price_per_unit,
    stockTransactionUpdateBody.price_per_unit,
  );
  TestValidator.equals(
    "transaction fee updated",
    updatedStockTransaction.transaction_fee,
    stockTransactionUpdateBody.transaction_fee,
  );
  TestValidator.equals(
    "total price updated",
    updatedStockTransaction.total_price,
    totalPriceUpdate,
  );
}
