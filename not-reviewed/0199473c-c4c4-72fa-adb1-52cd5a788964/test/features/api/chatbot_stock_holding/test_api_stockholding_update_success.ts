import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import type { IChatbotStockHolding } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockHolding";

export async function test_api_stockholding_update_success(
  connection: api.IConnection,
) {
  // 1. Create a chatbot member
  const memberCreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;
  const member: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);

  // 2. Create an initial stock holding
  const stockHoldingCreateBody = {
    user_id: member.id,
    stock_item_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IChatbotStockHolding.ICreate;
  const stockHolding: IChatbotStockHolding =
    await api.functional.chatbot.member.chatbotMembers.stockHoldings.create(
      connection,
      {
        memberId: member.id,
        body: stockHoldingCreateBody,
      },
    );
  typia.assert(stockHolding);

  // 3. Update the stock holding
  const stockHoldingUpdateBody = {
    quantity: stockHolding.quantity + 10,
    deleted_at: null,
  } satisfies IChatbotStockHolding.IUpdate;
  const updatedStockHolding: IChatbotStockHolding =
    await api.functional.chatbot.member.chatbotMembers.stockHoldings.update(
      connection,
      {
        memberId: member.id,
        stockHoldingId: stockHolding.id,
        body: stockHoldingUpdateBody,
      },
    );
  typia.assert(updatedStockHolding);

  // 4. Validate updated stock holding
  TestValidator.equals(
    "member ID remains the same",
    updatedStockHolding.user_id,
    member.id,
  );
  TestValidator.equals(
    "stock holding ID remains the same",
    updatedStockHolding.id,
    stockHolding.id,
  );
  TestValidator.equals(
    "stock item ID remains unchanged",
    updatedStockHolding.stock_item_id,
    stockHolding.stock_item_id,
  );
  TestValidator.equals(
    "quantity is updated correctly",
    updatedStockHolding.quantity,
    stockHoldingUpdateBody.quantity,
  );
  TestValidator.equals(
    "deleted_at is null",
    updatedStockHolding.deleted_at,
    null,
  );
}
