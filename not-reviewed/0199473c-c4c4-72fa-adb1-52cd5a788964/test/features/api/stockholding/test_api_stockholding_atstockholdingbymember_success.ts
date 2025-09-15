import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import type { IChatbotStockHolding } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockHolding";
import type { IChatbotStockHoldings } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotStockHoldings";

/**
 * End-to-end test for fetching detailed stock holding information of a
 * chatbot member.
 *
 * This test covers the workflow of a chatbot member user joining the
 * system, then creating a stock holding under their account, and finally
 * retrieving that specific stock holding detail.
 *
 * Workflow:
 *
 * 1. Member user joins the system with random internal sender ID and nickname.
 * 2. The newly joined member creates a stock holding record with a random
 *    stock item and quantity.
 * 3. The test retrieves the created stock holding using the memberId and
 *    stockHoldingId.
 * 4. Validates that the fetched stock holding matches the created stock
 *    holding data.
 *
 * The test checks for proper type assertions, UUID formats, and existence
 * of timestamps. It also confirms the business logic that the stock holding
 * belongs to the member who created it.
 */
export async function test_api_stockholding_atstockholdingbymember_success(
  connection: api.IConnection,
) {
  // 1. Member joins the chatbot system
  const joinBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(24),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;

  const member: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Prepare stock holding creation info
  const createBody = {
    user_id: member.id,
    stock_item_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IChatbotStockHolding.ICreate;

  // Create stock holding record
  const stockHolding: IChatbotStockHolding =
    await api.functional.chatbot.member.chatbotMembers.stockHoldings.create(
      connection,
      {
        memberId: member.id,
        body: createBody,
      },
    );
  typia.assert(stockHolding);

  // 3. Fetch stock holding detail by memberId and stockHoldingId
  const fetchedHolding: IChatbotStockHoldings =
    await api.functional.chatbot.member.chatbotMembers.stockHoldings.atStockHoldingByMember(
      connection,
      {
        memberId: member.id,
        stockHoldingId: stockHolding.id,
      },
    );
  typia.assert(fetchedHolding);

  // 4. Validate fetched data matches create data
  TestValidator.equals(
    "user_id matches member id",
    fetchedHolding.user_id,
    member.id,
  );
  TestValidator.equals(
    "stock_item_id matches create request",
    fetchedHolding.stock_item_id,
    createBody.stock_item_id,
  );
  TestValidator.equals(
    "quantity matches create request",
    fetchedHolding.quantity,
    createBody.quantity,
  );

  // Validate timestamps exist and are correctly formatted
  TestValidator.predicate(
    "created_at is valid date-time format",
    typeof fetchedHolding.created_at === "string" &&
      /^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}/.test(
        fetchedHolding.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is valid date-time format",
    typeof fetchedHolding.updated_at === "string" &&
      /^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}/.test(
        fetchedHolding.updated_at,
      ),
  );
  // deleted_at is either null or undefined or valid date-time string
  if (
    fetchedHolding.deleted_at !== null &&
    fetchedHolding.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deleted_at is valid date-time format",
      typeof fetchedHolding.deleted_at === "string" &&
        /^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}/.test(
          fetchedHolding.deleted_at,
        ),
    );
  }
}
