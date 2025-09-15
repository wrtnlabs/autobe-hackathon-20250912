import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import type { IChatbotSlotmachinePlay } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotSlotmachinePlay";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIChatbotSlotmachinePlay } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotSlotmachinePlay";

/**
 * Test comprehensive retrieval of slot machine play records for
 * authenticated 'member' users.
 *
 * Steps:
 *
 * 1. Register a new member user with unique internal sender ID and nickname.
 * 2. Login as this member user to obtain authentication tokens.
 * 3. Call the slotmachine play index API with various filters:
 *
 *    - No filters: basic pagination test
 *    - Filter by chatbot_member_id
 *    - Filter by created_at_gte and created_at_lte date ranges
 *    - Test ordering by 'created_at' with ascending and descending directions
 *    - Pagination boundary test: page and limit parameters
 * 4. Validate response format to ensure compliance with
 *    IPageIChatbotSlotmachinePlay.ISummary schema.
 * 5. Verify that unauthorized calls (without login) are rejected with error.
 *
 * Each API response is typia.asserted for strict runtime type safety.
 * TestValidator functions verify business rule enforcement and correct data
 * returns.
 *
 * This test validates multiple combinations of filters for the list
 * retrieval. Also confirms correct authentication enforcement for 'member'
 * role.
 */
export async function test_api_slotmachine_play_list_filter_pagination_member_auth(
  connection: api.IConnection,
) {
  // 1. Register a unique member user
  const memberCreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(16),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;

  const joinedMember: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: memberCreateBody,
    });
  typia.assert(joinedMember);

  // 2. Login as the same member to authenticate
  const memberLoginBody = {
    internal_sender_id: joinedMember.internal_sender_id,
    nickname: joinedMember.nickname,
  } satisfies IChatbotMember.ILogin;

  const loggedInMember: IChatbotMember.IAuthorized =
    await api.functional.auth.member.login.loginMember(connection, {
      body: memberLoginBody,
    });
  typia.assert(loggedInMember);

  // Helper to call index API with given request body
  async function callIndex(body: IChatbotSlotmachinePlay.IRequest) {
    const response =
      await api.functional.chatbot.member.slotmachine.plays.index(connection, {
        body,
      });
    typia.assert(response);
    return response;
  }

  // 3. Call slotmachine plays index with no filters: baseline pagination
  const baselineRequest = {
    page: 0,
    limit: 10,
  } satisfies IChatbotSlotmachinePlay.IRequest;

  const baselineResponse = await callIndex(baselineRequest);
  TestValidator.predicate(
    "baseline pagination page number is 0",
    baselineResponse.pagination.current === 0,
  );
  TestValidator.predicate(
    "baseline pagination limit is 10",
    baselineResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "baseline pagination records count is non-negative",
    baselineResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "baseline pagination pages count is non-negative",
    baselineResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "baseline data length is less or equal limit",
    baselineResponse.data.length <= 10,
  );

  // 4. Filter by chatbot_member_id (the logged in member's id)
  const filterByMemberIdRequest = {
    chatbot_member_id: joinedMember.id,
    limit: 5,
    page: 0,
  } satisfies IChatbotSlotmachinePlay.IRequest;
  const filteredByMemberResponse = await callIndex(filterByMemberIdRequest);
  filteredByMemberResponse.data.forEach((play) => {
    TestValidator.equals(
      "filter by member: play belongs to member",
      play.chatbot_member_id,
      joinedMember.id,
    );
  });

  // 5. Filter by created_at range (gte and lte)
  // Use current datetime, created_at_gte = 7 days ago, created_at_lte = now
  const nowISOString = new Date().toISOString();
  const sevenDaysAgoDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const filterByCreatedAtRange = {
    created_at_gte: sevenDaysAgoDate,
    created_at_lte: nowISOString,
    limit: 10,
    page: 0,
  } satisfies IChatbotSlotmachinePlay.IRequest;

  const filteredByDateResponse = await callIndex(filterByCreatedAtRange);
  filteredByDateResponse.data.forEach((play) => {
    TestValidator.predicate(
      "filter by created_at_gte: play created_at >= sevenDaysAgo",
      play.created_at >= sevenDaysAgoDate,
    );
    TestValidator.predicate(
      "filter by created_at_lte: play created_at <= now",
      play.created_at <= nowISOString,
    );
  });

  // 6. Test ordering: orderBy and direction (asc, desc)
  // Ascending order
  const ascendingOrderRequest = {
    orderBy: "created_at",
    direction: "asc",
    limit: 10,
    page: 0,
  } satisfies IChatbotSlotmachinePlay.IRequest;
  const ascendingOrderResponse = await callIndex(ascendingOrderRequest);
  for (let i = 1; i < ascendingOrderResponse.data.length; i++) {
    TestValidator.predicate(
      "asc order by created_at",
      ascendingOrderResponse.data[i].created_at >=
        ascendingOrderResponse.data[i - 1].created_at,
    );
  }

  // Descending order
  const descendingOrderRequest = {
    orderBy: "created_at",
    direction: "desc",
    limit: 10,
    page: 0,
  } satisfies IChatbotSlotmachinePlay.IRequest;
  const descendingOrderResponse = await callIndex(descendingOrderRequest);
  for (let i = 1; i < descendingOrderResponse.data.length; i++) {
    TestValidator.predicate(
      "desc order by created_at",
      descendingOrderResponse.data[i].created_at <=
        descendingOrderResponse.data[i - 1].created_at,
    );
  }

  // 7. Pagination boundary tests: page and limit large values
  // Test page=1 and limit=5
  const page1Limit5Request = {
    page: 1,
    limit: 5,
  } satisfies IChatbotSlotmachinePlay.IRequest;
  const page1Limit5Response = await callIndex(page1Limit5Request);
  TestValidator.predicate(
    "page 1 limit 5: response data length <= 5",
    page1Limit5Response.data.length <= 5,
  );
  TestValidator.equals(
    "page 1 limit 5: pagination current page is 1",
    page1Limit5Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 5: pagination limit is 5",
    page1Limit5Response.pagination.limit,
    5,
  );

  // 8. Confirm unauthorized access returns error
  // Create a new connection with cleared headers (unauthorized)
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthorized access should throw", async () => {
    await api.functional.chatbot.member.slotmachine.plays.index(
      unauthorizedConnection,
      {
        body: baselineRequest,
      },
    );
  });
}
