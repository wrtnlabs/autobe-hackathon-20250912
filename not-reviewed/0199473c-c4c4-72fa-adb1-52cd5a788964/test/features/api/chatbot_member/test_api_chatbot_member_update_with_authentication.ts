import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";

/**
 * Test updating a chatbot member's information via authenticated API calls.
 *
 * This test executes the full workflow for a member user:
 *
 * 1. Registers a fresh member user account (join) with random
 *    internal_sender_id and nickname.
 * 2. Logs in with the same credentials to receive authorization tokens.
 * 3. Updates the member's nickname through an authenticated PUT request.
 * 4. Verifies the member's updated nickname and that internal_sender_id
 *    remains unchanged.
 * 5. Ensures timestamps are valid and consistent.
 *
 * All operations use strict type checking and runtime type assertions.
 * Authentication tokens are automatically managed by the SDK during login.
 */
export async function test_api_chatbot_member_update_with_authentication(
  connection: api.IConnection,
) {
  // 1. Join: Register a new member with random data
  const joinBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(16),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;

  const joinResponse: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: joinBody,
    });
  typia.assert(joinResponse);

  // Assert returned fields are as expected
  TestValidator.equals(
    "joined member internal_sender_id matches input",
    joinResponse.internal_sender_id,
    joinBody.internal_sender_id,
  );

  // 2. Login: Authenticate with the same credentials
  const loginBody = {
    internal_sender_id: joinBody.internal_sender_id,
    nickname: joinBody.nickname,
  } satisfies IChatbotMember.ILogin;

  const loginResponse: IChatbotMember.IAuthorized =
    await api.functional.auth.member.login.loginMember(connection, {
      body: loginBody,
    });
  typia.assert(loginResponse);

  // Assert that login returns the same member ID and internal_sender_id
  TestValidator.equals(
    "login member id matches join member id",
    loginResponse.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "login member internal_sender_id matches join",
    loginResponse.internal_sender_id,
    joinResponse.internal_sender_id,
  );

  // 3. Update: Change the nickname of the member
  const newNickname = RandomGenerator.name();
  const updateBody = {
    nickname: newNickname,
  } satisfies IChatbotMember.IUpdate;

  const updateResponse: IChatbotMember =
    await api.functional.chatbot.member.chatbotMembers.update(connection, {
      id: joinResponse.id,
      body: updateBody,
    });
  typia.assert(updateResponse);

  // Validate that the nickname was updated
  TestValidator.equals(
    "member nickname updated",
    updateResponse.nickname,
    newNickname,
  );

  // Validate that internal_sender_id is unchanged
  TestValidator.equals(
    "internal_sender_id unchanged",
    updateResponse.internal_sender_id,
    joinResponse.internal_sender_id,
  );

  // Validate timestamps
  TestValidator.predicate(
    "updated_at is not earlier than created_at",
    new Date(updateResponse.updated_at).getTime() >=
      new Date(updateResponse.created_at).getTime(),
  );

  // Validate deleted_at is null or undefined
  TestValidator.predicate(
    "deleted_at is null or undefined",
    updateResponse.deleted_at === null ||
      updateResponse.deleted_at === undefined,
  );
}
