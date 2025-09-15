import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import type { IChatbotSlotmachinePlay } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotSlotmachinePlay";

/**
 * Tests detailed slot machine play information retrieval for authenticated
 * member users.
 *
 * This test covers full member user authentication including registration
 * (join) and login, then verifies that authenticated users can retrieve
 * detailed slot machine play records using valid IDs.
 *
 * It validates response data shapes, business logic constraints on the slot
 * machine play fields, and proper error handling for invalid IDs or
 * unauthorized access.
 *
 * The test ensures that the API enforces member authentication and
 * restricts access to authorized users only. It verifies both success and
 * failure cases (invalid or malformed IDs, missing authentication).
 */
export async function test_api_slotmachine_play_detail_access_member_auth(
  connection: api.IConnection,
) {
  // 1. Register a new member with random internal_sender_id and nickname
  const memberCreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;

  const member: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);

  // 2. Login as the registered member with the same credentials
  const memberLoginBody = {
    internal_sender_id: memberCreateBody.internal_sender_id,
    nickname: memberCreateBody.nickname,
  } satisfies IChatbotMember.ILogin;

  const loggedInMember: IChatbotMember.IAuthorized =
    await api.functional.auth.member.login.loginMember(connection, {
      body: memberLoginBody,
    });
  typia.assert(loggedInMember);

  // 3. Generate a valid slot machine play ID to retrieve
  // For testing, use a random UUID since we don't have creation API
  const validPlayId = typia.random<string & tags.Format<"uuid">>();

  // 4. Retrieve the slot machine play details with a valid ID as authenticated user
  const play: IChatbotSlotmachinePlay =
    await api.functional.chatbot.member.slotmachine.plays.at(connection, {
      id: validPlayId,
    });
  typia.assert(play);

  TestValidator.predicate(
    "retrieved play id matches valid ID",
    play.id === validPlayId,
  );

  TestValidator.predicate("valid bet points", play.bet_points >= 0);
  TestValidator.predicate(
    "slot1 in range 0-9",
    play.slot1 >= 0 && play.slot1 <= 9,
  );
  TestValidator.predicate(
    "slot2 in range 0-9",
    play.slot2 >= 0 && play.slot2 <= 9,
  );
  TestValidator.predicate(
    "slot3 in range 0-9",
    play.slot3 >= 0 && play.slot3 <= 9,
  );
  TestValidator.predicate(
    "payout points non-negative",
    play.payout_points >= 0,
  );

  // 5. Try retrieving with a non-existent valid UUID - expect error
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "error when retrieving play by non-existent ID",
    async () => {
      await api.functional.chatbot.member.slotmachine.plays.at(connection, {
        id: nonExistentId,
      });
    },
  );

  // 6. Try retrieving with malformed ID - not matching UUID format - expect error
  await TestValidator.error(
    "error when retrieving play with malformed ID",
    async () => {
      await api.functional.chatbot.member.slotmachine.plays.at(connection, {
        id: "malformed-uuid",
      });
    },
  );

  // 7. Clear authorization headers or create unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 8. Try retrieving slot machine play details without authentication
  await TestValidator.error(
    "error when retrieving play without authentication",
    async () => {
      await api.functional.chatbot.member.slotmachine.plays.at(
        unauthenticatedConnection,
        { id: validPlayId },
      );
    },
  );
}
