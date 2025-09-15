import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotChatbotMembersStockHoldings } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotChatbotMembersStockHoldings";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import type { IChatbotStockHoldings } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockHoldings";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIChatbotStockHoldings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotStockHoldings";

export async function test_api_stockholding_indexstockholdingsbymember_success(
  connection: api.IConnection,
) {
  // 1. Create and authenticate chatbot member
  const createBody = {
    internal_sender_id: `sender_${RandomGenerator.alphaNumeric(8)}`,
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;

  const member: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: createBody,
    });
  typia.assert(member);

  // 2. Compose request for stockHoldings retrieval with pagination and filtering
  const page = 1;
  const limit = 10;
  // For optional filters like stock_item_id, min_quantity, max_quantity,
  // randomly choose to include or not
  const stockItemId: (string & tags.Format<"uuid">) | null =
    Math.random() < 0.5 ? typia.random<string & tags.Format<"uuid">>() : null;
  const minQuantity: (number & tags.Type<"int32"> & tags.Minimum<0>) | null =
    Math.random() < 0.5 ? 1 : null;
  const maxQuantity: (number & tags.Type<"int32"> & tags.Minimum<0>) | null =
    Math.random() < 0.5 ? 100 : null;

  const requestBody = {
    page: page,
    limit: limit,
    stock_item_id: stockItemId,
    min_quantity: minQuantity,
    max_quantity: maxQuantity,
  } satisfies IChatbotChatbotMembersStockHoldings.IRequest;

  // 3. Call the indexStockHoldingsByMember API with the authenticated member's ID
  const output: IPageIChatbotStockHoldings.ISummary =
    await api.functional.chatbot.member.chatbotMembers.stockHoldings.indexStockHoldingsByMember(
      connection,
      {
        memberId: member.id,
        body: requestBody,
      },
    );

  // 4. Validate the response type definitively
  typia.assert(output);

  // 5. Validate pagination info
  TestValidator.predicate(
    "pagination current page match",
    output.pagination.current === page,
  );
  TestValidator.predicate(
    "pagination limit match",
    output.pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    output.pagination.records >= 0,
  );

  // 6. Validate each stock holding belongs to the member and has valid quantity
  for (const stock of output.data) {
    typia.assert(stock);
    TestValidator.equals(
      "stock holding user_id matches member id",
      stock.user_id,
      member.id,
    );
    TestValidator.predicate("quantity non-negative", stock.quantity >= 0);
    if (stockItemId !== null) {
      TestValidator.equals(
        "stock holding stock_item_id matches filter",
        stock.stock_item_id,
        stockItemId,
      );
    }
    if (minQuantity !== null) {
      TestValidator.predicate(
        "stock holding quantity >= min_quantity",
        stock.quantity >= minQuantity,
      );
    }
    if (maxQuantity !== null) {
      TestValidator.predicate(
        "stock holding quantity <= max_quantity",
        stock.quantity <= maxQuantity,
      );
    }
  }
}
