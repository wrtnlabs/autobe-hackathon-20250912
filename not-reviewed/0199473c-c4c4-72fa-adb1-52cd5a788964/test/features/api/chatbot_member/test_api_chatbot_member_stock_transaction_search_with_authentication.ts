import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import type { IChatbotStockTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockTransaction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIChatbotStockTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotStockTransaction";

/**
 * This end-to-end test validates the search and filtering capabilities of
 * the chatbot member stock transactions endpoint with proper member
 * authentication. The test begins by creating a new member through the join
 * endpoint to acquire authentication tokens and member ID. It then performs
 * multiple PATCH calls to the stockTransactions search API using the
 * authenticated member's ID and token. Each search request uses different
 * combinations of filters such as transaction_type, quantity ranges, price
 * ranges, pagination, and sorting. The responses are validated for correct
 * pagination, filtering adherence, and that all returned transactions
 * belong strictly to the authorized member. Additionally, attempts to query
 * with a mismatched member ID compared to the authentication token are
 * tested to confirm authorization enforcement. This ensures no member can
 * access another's stock transaction data.
 */
export async function test_api_chatbot_member_stock_transaction_search_with_authentication(
  connection: api.IConnection,
) {
  // 1. Member user joins to get authorization token and member info
  const memberCreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;

  const member: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);

  // 2. Confirm token is set in connection.headers by SDK after join
  // No direct manipulation of headers by test code (automatic by SDK)

  // Store member id for search queries
  const memberId = member.id;

  // 3. Prepare some plausible filters for testing (min/max quantity, price)
  // Also include transaction_type filter and pagination & sorting conditions

  // First: unfiltered search of member's transactions
  const query1: IChatbotStockTransaction.IRequest = {
    user_id: memberId,
    page: 1,
    limit: 10,
    sort: "created_at desc",
  };

  const response1: IPageIChatbotStockTransaction =
    await api.functional.chatbot.member.chatbotMembers.stockTransactions.index(
      connection,
      {
        memberId,
        body: query1,
      },
    );
  typia.assert(response1);

  // Validate all transactions' user_id matches memberId
  for (const tx of response1.data) {
    TestValidator.equals("transaction belongs to member", tx.user_id, memberId);
  }

  // Validate pagination fields
  TestValidator.predicate(
    "pagination page number",
    response1.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit count",
    response1.pagination.limit === 10,
  );

  // 4. Filter by transaction_type = 'buy'
  const query2: IChatbotStockTransaction.IRequest = {
    user_id: memberId,
    transaction_type: "buy",
    page: 1,
    limit: 10,
    sort: "created_at asc",
  };

  const response2: IPageIChatbotStockTransaction =
    await api.functional.chatbot.member.chatbotMembers.stockTransactions.index(
      connection,
      {
        memberId,
        body: query2,
      },
    );
  typia.assert(response2);

  // Validate all transactions are 'buy' type
  for (const tx of response2.data) {
    TestValidator.equals("transaction type is buy", tx.transaction_type, "buy");
    // Confirm user_id matches memberId
    TestValidator.equals("transaction belongs to member", tx.user_id, memberId);
  }

  // 5. Filter by min_quantity = 5 and max_quantity = 10
  const query3: IChatbotStockTransaction.IRequest = {
    user_id: memberId,
    min_quantity: 5,
    max_quantity: 10,
    page: 1,
    limit: 5,
    sort: "created_at desc",
  };

  const response3: IPageIChatbotStockTransaction =
    await api.functional.chatbot.member.chatbotMembers.stockTransactions.index(
      connection,
      {
        memberId,
        body: query3,
      },
    );
  typia.assert(response3);

  for (const tx of response3.data) {
    TestValidator.predicate("transaction quantity minimum", tx.quantity >= 5);
    TestValidator.predicate("transaction quantity maximum", tx.quantity <= 10);
    TestValidator.equals("transaction belongs to member", tx.user_id, memberId);
  }

  // 6. Filter by min_price_per_unit and max_price_per_unit
  const query4: IChatbotStockTransaction.IRequest = {
    user_id: memberId,
    min_price_per_unit: 100,
    max_price_per_unit: 500,
    page: 1,
    limit: 5,
    sort: "created_at asc",
  };

  const response4: IPageIChatbotStockTransaction =
    await api.functional.chatbot.member.chatbotMembers.stockTransactions.index(
      connection,
      {
        memberId,
        body: query4,
      },
    );
  typia.assert(response4);

  for (const tx of response4.data) {
    TestValidator.predicate("price per unit minimum", tx.price_per_unit >= 100);
    TestValidator.predicate("price per unit maximum", tx.price_per_unit <= 500);
    TestValidator.equals("transaction belongs to member", tx.user_id, memberId);
  }

  // 7. Validate pagination page 2
  const query5: IChatbotStockTransaction.IRequest = {
    user_id: memberId,
    page: 2,
    limit: 5,
    sort: "created_at desc",
  };

  const response5: IPageIChatbotStockTransaction =
    await api.functional.chatbot.member.chatbotMembers.stockTransactions.index(
      connection,
      {
        memberId,
        body: query5,
      },
    );
  typia.assert(response5);

  TestValidator.predicate(
    "pagination current page",
    response5.pagination.current === 2,
  );
  for (const tx of response5.data) {
    TestValidator.equals("transaction belongs to member", tx.user_id, memberId);
  }

  // 8. Attempt unauthorized access: query another member's stock transactions
  // Create a second member
  const member2CreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;

  const member2: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: member2CreateBody,
    });
  typia.assert(member2);

  // Attempt to query member1's transactions using member2's access token (since token is set in connection automatically, we must switch connection)
  // To simulate switching tokens, create a new connection instance with same host but empty headers - SDK will inject new token on join
  const connectionForMember2: api.IConnection = { ...connection, headers: {} };

  // Authenticate member2 by join - token set automatically on connectionForMember2
  await api.functional.auth.member.join.joinMember(connectionForMember2, {
    body: member2CreateBody,
  });

  // Now attempt to query member1's stock transactions with connection for member2
  await TestValidator.error("unauthorized access forbidden", async () => {
    await api.functional.chatbot.member.chatbotMembers.stockTransactions.index(
      connectionForMember2,
      {
        memberId,
        body: {
          user_id: memberId,
          page: 1,
          limit: 3,
        } satisfies IChatbotStockTransaction.IRequest,
      },
    );
  });
}
