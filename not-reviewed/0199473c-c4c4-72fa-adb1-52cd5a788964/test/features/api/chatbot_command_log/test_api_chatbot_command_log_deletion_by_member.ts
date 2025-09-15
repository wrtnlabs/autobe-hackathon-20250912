import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotCommandLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotCommandLog";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";

/**
 * This test function verifies that a chatbot member can delete their own
 * chatbot command logs permanently. It also ensures that logs cannot be deleted
 * by unauthorized members or deleted twice.
 *
 * The test workflow includes:
 *
 * 1. Register and authenticate a member.
 * 2. Create a command log for that member.
 * 3. Delete the command log successfully.
 * 4. Attempt to delete the same log again and expect an error.
 * 5. Register another member and create a log for them.
 * 6. Attempt to delete the second member's log using the first member's auth and
 *    expect an authorization error.
 */
export async function test_api_chatbot_command_log_deletion_by_member(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate first chatbot member
  const member1: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: {
        internal_sender_id: RandomGenerator.alphaNumeric(16),
        nickname: RandomGenerator.name(),
      } satisfies IChatbotMember.ICreate,
    });
  typia.assert(member1);

  // Step 2: Create a command log for member 1
  const createdLog: IChatbotCommandLog =
    await api.functional.chatbot.member.chatbotCommandLogs.create(connection, {
      body: {
        chatbot_member_id: member1.id,
        command: "/hello",
        command_parameters: JSON.stringify({ language: "en" }),
      } satisfies IChatbotCommandLog.ICreate,
    });
  typia.assert(createdLog);

  // Step 3: Delete the created log by member 1's auth
  await api.functional.chatbot.member.chatbotCommandLogs.erase(connection, {
    chatbotCommandLogId: createdLog.id,
  });

  // Step 4: Try to delete the same log again, expect error (likely 404)
  await TestValidator.error(
    "deletion of already deleted log should fail",
    async () => {
      await api.functional.chatbot.member.chatbotCommandLogs.erase(connection, {
        chatbotCommandLogId: createdLog.id,
      });
    },
  );

  // Step 5: Register and authenticate another member
  const member2: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: {
        internal_sender_id: RandomGenerator.alphaNumeric(16),
        nickname: RandomGenerator.name(),
      } satisfies IChatbotMember.ICreate,
    });
  typia.assert(member2);

  // Step 6: Create another log for member2
  const log2: IChatbotCommandLog =
    await api.functional.chatbot.member.chatbotCommandLogs.create(connection, {
      body: {
        chatbot_member_id: member2.id,
        command: "/bye",
        command_parameters: null,
      } satisfies IChatbotCommandLog.ICreate,
    });
  typia.assert(log2);

  // Attempt to delete member2's log using member1's auth - simulate this by switching back to member1
  await api.functional.auth.member.join.joinMember(connection, {
    body: {
      internal_sender_id: member1.internal_sender_id,
      nickname: member1.nickname,
    } satisfies IChatbotMember.ICreate,
  });

  // Now attempt unauthorized deletion - should error
  await TestValidator.error(
    "unauthorized member should not delete others' logs",
    async () => {
      await api.functional.chatbot.member.chatbotCommandLogs.erase(connection, {
        chatbotCommandLogId: log2.id,
      });
    },
  );
}
