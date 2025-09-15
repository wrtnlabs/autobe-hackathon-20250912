import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import type { IChatbotStockHolding } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockHolding";

/**
 * This E2E test validates the successful creation of a chatbot stock holding
 * record. First, a chatbot member is registered and authenticated, returning an
 * authorized member entity including the member ID and JWT token.
 *
 * Then, a stock holding creation request is prepared specifying that member's
 * user ID as user_id, a randomly generated stock_item_id (UUID format), and a
 * positive quantity of stock items held.
 *
 * The test then calls the stockHoldings.create API endpoint with the memberId
 * path parameter and the creation payload.
 *
 * After the creation API call returns, the test validates that the returned
 * stock holding entity:
 *
 * - Has a valid UUID id
 * - Has the user_id matching the authorized member's id
 * - Has the stock_item_id matching the request
 * - Has a quantity matching the request
 * - Includes non-null created_at and updated_at timestamps
 *
 * This simulates a real user flow of registering a new chatbot member and
 * creating stock holdings under that member, ensuring the entire process works
 * correctly.
 */
export async function test_api_stockholding_create_success(
  connection: api.IConnection,
) {
  // 1. Register a new chatbot member user
  const createMemberBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(16),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;

  const authorizedMember: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: createMemberBody,
    });
  typia.assert(authorizedMember);

  // 2. Prepare stock holding creation data
  const stockItemId = typia.random<string & tags.Format<"uuid">>();
  const quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const createStockHoldingBody = {
    user_id: authorizedMember.id,
    stock_item_id: stockItemId,
    quantity: quantity,
  } satisfies IChatbotStockHolding.ICreate;

  // 3. Call the stock holdings creation API
  const stockHolding: IChatbotStockHolding =
    await api.functional.chatbot.member.chatbotMembers.stockHoldings.create(
      connection,
      {
        memberId: authorizedMember.id,
        body: createStockHoldingBody,
      },
    );
  typia.assert(stockHolding);

  // 4. Validate the returned stock holding record
  TestValidator.predicate(
    "stock holding id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      stockHolding.id,
    ),
  );
  TestValidator.equals(
    "stock holding user_id matches",
    stockHolding.user_id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "stock holding stock_item_id matches",
    stockHolding.stock_item_id,
    stockItemId,
  );
  TestValidator.equals(
    "stock holding quantity matches",
    stockHolding.quantity,
    quantity,
  );
  TestValidator.predicate(
    "stock holding created_at is not null",
    stockHolding.created_at !== null && stockHolding.created_at !== undefined,
  );
  TestValidator.predicate(
    "stock holding updated_at is not null",
    stockHolding.updated_at !== null && stockHolding.updated_at !== undefined,
  );
}
