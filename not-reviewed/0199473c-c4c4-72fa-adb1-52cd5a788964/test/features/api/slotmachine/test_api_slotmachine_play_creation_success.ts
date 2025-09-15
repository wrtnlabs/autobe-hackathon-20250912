import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import type { IChatbotSlotmachinePlay } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotSlotmachinePlay";

/**
 * This test verifies the full user journey of a chatbot member creating a
 * slot machine play.
 *
 * The test covers:
 *
 * 1. Member registration via joinMember API with randomized unique internal
 *    sender ID and nickname.
 * 2. Member login via loginMember API using the same credentials to obtain
 *    authenticated tokens.
 * 3. Slot machine play record creation linked to the authenticated member.
 *
 * The test asserts correct generation and return of UUIDs, timestamps, and
 * point calculations. It confirms that the play payout matches the simple
 * business rule that all digit match leads to tenfold payout.
 *
 * Each step uses strict type checks with typia.assert and thorough property
 * validations. This ensures robust API contract adherence and correct
 * business logic implementation.
 */
export async function test_api_slotmachine_play_creation_success(
  connection: api.IConnection,
) {
  // 1. Create a unique internal sender ID and nickname for a new member
  const internalSenderId: string = RandomGenerator.alphaNumeric(16);
  const nickname: string = RandomGenerator.name(2);

  // 2. Use the joinMember API to register the new member
  const authorizedMember: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: {
        internal_sender_id: internalSenderId,
        nickname: nickname,
      } satisfies IChatbotMember.ICreate,
    });
  typia.assert(authorizedMember);

  TestValidator.predicate(
    "member join returns valid ID",
    authorizedMember.id.length === 36,
  );
  TestValidator.equals(
    "member join returns internal_sender_id",
    authorizedMember.internal_sender_id,
    internalSenderId,
  );
  TestValidator.equals(
    "member join returns expected nickname",
    authorizedMember.nickname,
    nickname,
  );

  // 3. Authenticate using loginMember API
  const loggedInMember: IChatbotMember.IAuthorized =
    await api.functional.auth.member.login.loginMember(connection, {
      body: {
        internal_sender_id: internalSenderId,
        nickname: nickname,
      } satisfies IChatbotMember.ILogin,
    });
  typia.assert(loggedInMember);

  TestValidator.equals(
    "login member matches join member id",
    loggedInMember.id,
    authorizedMember.id,
  );

  // 4. Create a slot machine play entry
  const betPoints: number & tags.Type<"int32"> = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const slot1: number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<9> =
    typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<9>
    >();
  const slot2: number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<9> =
    typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<9>
    >();
  const slot3: number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<9> =
    typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<9>
    >();

  // Simple payout logic: if all slots match payout is betPoints * 10, else 0
  const payoutPoints = slot1 === slot2 && slot2 === slot3 ? betPoints * 10 : 0;

  const playCreateBody = {
    chatbot_member_id: authorizedMember.id,
    bet_points: betPoints,
    slot1: slot1,
    slot2: slot2,
    slot3: slot3,
    payout_points: payoutPoints,
  } satisfies IChatbotSlotmachinePlay.ICreate;

  const play: IChatbotSlotmachinePlay =
    await api.functional.chatbot.member.slotmachine.plays.create(connection, {
      body: playCreateBody,
    });
  typia.assert(play);

  TestValidator.equals(
    "play chatbot_member_id matches member id",
    play.chatbot_member_id,
    authorizedMember.id,
  );

  TestValidator.equals("play bet_points matches", play.bet_points, betPoints);
  TestValidator.equals("play slot1 matches", play.slot1, slot1);
  TestValidator.equals("play slot2 matches", play.slot2, slot2);
  TestValidator.equals("play slot3 matches", play.slot3, slot3);
  TestValidator.equals(
    "play payout_points matches",
    play.payout_points,
    payoutPoints,
  );
  TestValidator.predicate("play id is a valid uuid", play.id.length === 36);
  TestValidator.predicate(
    "play created_at is a valid ISO date",
    !!Date.parse(play.created_at),
  );
}
