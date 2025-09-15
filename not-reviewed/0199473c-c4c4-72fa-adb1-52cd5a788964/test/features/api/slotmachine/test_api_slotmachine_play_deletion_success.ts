import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";

/**
 * Validate that an authenticated member can successfully delete their own
 * slot machine play.
 *
 * Steps performed:
 *
 * 1. Register new member user.
 * 2. Authenticate the member user by logging in.
 * 3. Simulate the creation of a slot machine play for the member by generating
 *    a UUID representing the play ID.
 * 4. Delete the created slot machine play by its ID.
 * 5. Confirm that the deletion does not throw errors.
 * 6. Attempt deletion again and verify it throws an error due to
 *    non-existence.
 */
export async function test_api_slotmachine_play_deletion_success(
  connection: api.IConnection,
) {
  // 1. Member registers
  const memberCreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(16),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;

  const member: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);

  // 2. Member login
  const memberLoginBody = {
    internal_sender_id: member.internal_sender_id,
    nickname: member.nickname,
  } satisfies IChatbotMember.ILogin;

  const loginResponse: IChatbotMember.IAuthorized =
    await api.functional.auth.member.login.loginMember(connection, {
      body: memberLoginBody,
    });
  typia.assert(loginResponse);

  // Simulate creation of a slot machine play by generating a random UUID as its ID
  const playId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Member deletes the created slot machine play record
  await api.functional.chatbot.member.slotmachine.plays.erase(connection, {
    id: playId,
  });

  // 4. Confirm deleting again causes error (play no longer exists)
  await TestValidator.error(
    "deleting non-existent play throws error",
    async () => {
      await api.functional.chatbot.member.slotmachine.plays.erase(connection, {
        id: playId,
      });
    },
  );
}
