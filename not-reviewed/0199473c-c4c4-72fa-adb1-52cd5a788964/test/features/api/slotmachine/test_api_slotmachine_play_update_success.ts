import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import type { IChatbotSlotmachinePlay } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotSlotmachinePlay";

export async function test_api_slotmachine_play_update_success(
  connection: api.IConnection,
) {
  // Step 1: Register member user
  const internalSenderId = `user-${RandomGenerator.alphaNumeric(8)}`;
  const nickname = RandomGenerator.name();
  const joinBody = {
    internal_sender_id: internalSenderId,
    nickname: nickname,
  } satisfies IChatbotMember.ICreate;

  const joinedMember: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: joinBody,
    });
  typia.assert(joinedMember);

  // Step 2: Login as the member
  const loginBody = {
    internal_sender_id: joinedMember.internal_sender_id,
    nickname: joinedMember.nickname,
  } satisfies IChatbotMember.ILogin;

  const loggedInMember: IChatbotMember.IAuthorized =
    await api.functional.auth.member.login.loginMember(connection, {
      body: loginBody,
    });
  typia.assert(loggedInMember);

  // Step 3: Simulate existing slot machine play
  const initialPlay: IChatbotSlotmachinePlay = {
    id: typia.random<string & tags.Format<"uuid">>(),
    chatbot_member_id: loggedInMember.id,
    bet_points: 100,
    slot1: 3,
    slot2: 6,
    slot3: 9,
    payout_points: 200,
    created_at: new Date().toISOString(),
  };
  typia.assert(initialPlay);

  // Step 4: Prepare update with changed values
  const updateBody = {
    bet_points: initialPlay.bet_points + 50,
    slot1: (initialPlay.slot1 + 1) % 10,
    slot2: (initialPlay.slot2 + 2) % 10,
    slot3: (initialPlay.slot3 + 3) % 10,
    payout_points: initialPlay.payout_points + 100,
  } satisfies IChatbotSlotmachinePlay.IUpdate;

  // Step 5: Update the slot machine play
  const updatedPlay: IChatbotSlotmachinePlay =
    await api.functional.chatbot.member.slotmachine.plays.update(connection, {
      id: initialPlay.id,
      body: updateBody,
    });
  typia.assert(updatedPlay);

  // Step 6: Validate the updated result
  TestValidator.equals(
    "updated bet_points",
    updatedPlay.bet_points,
    updateBody.bet_points!,
  );
  TestValidator.equals("updated slot1", updatedPlay.slot1, updateBody.slot1!);
  TestValidator.equals("updated slot2", updatedPlay.slot2, updateBody.slot2!);
  TestValidator.equals("updated slot3", updatedPlay.slot3, updateBody.slot3!);
  TestValidator.equals(
    "updated payout_points",
    updatedPlay.payout_points,
    updateBody.payout_points!,
  );
  TestValidator.equals(
    "chatbot_member_id unchanged",
    updatedPlay.chatbot_member_id,
    initialPlay.chatbot_member_id,
  );
  TestValidator.equals("id unchanged", updatedPlay.id, initialPlay.id);
}
