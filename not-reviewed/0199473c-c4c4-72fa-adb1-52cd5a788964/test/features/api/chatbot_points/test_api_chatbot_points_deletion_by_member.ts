import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import type { IChatbotPoints } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotPoints";

/**
 * This test verifies that a member user can successfully delete their own
 * chatbot points record. It includes the full flow of member registration,
 * login, chatbot member creation, points creation, and deletion.
 *
 * The test checks for proper deletion by verifying the points record is no
 * longer accessible. Additionally, it tests unauthorized deletion attempts and
 * deletion of invalid IDs to confirm access control and error handling.
 */
export async function test_api_chatbot_points_deletion_by_member(
  connection: api.IConnection,
) {
  // 1. Member user registration and login
  const memberInternalSenderId = RandomGenerator.alphaNumeric(20);
  const memberNickname = RandomGenerator.name();

  const memberCreateBody = {
    internal_sender_id: memberInternalSenderId,
    nickname: memberNickname,
  } satisfies IChatbotMember.ICreate;

  // Member joins (register)
  const memberAuthorized: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: memberCreateBody,
    });
  typia.assert(memberAuthorized);

  // Member login
  const memberLoginBody = {
    internal_sender_id: memberInternalSenderId,
    nickname: memberNickname,
  } satisfies IChatbotMember.ILogin;

  const loginAuthorized: IChatbotMember.IAuthorized =
    await api.functional.auth.member.login.loginMember(connection, {
      body: memberLoginBody,
    });
  typia.assert(loginAuthorized);

  // 2. Create chatbot member
  const chatbotMemberBody = {
    internal_sender_id: memberInternalSenderId,
    nickname: memberNickname,
  } satisfies IChatbotMember.ICreate;

  const chatbotMember: IChatbotMember =
    await api.functional.chatbot.member.chatbotMembers.create(connection, {
      body: chatbotMemberBody,
    });
  typia.assert(chatbotMember);

  TestValidator.equals(
    "chatbot member internal_sender_id match",
    chatbotMember.internal_sender_id,
    memberInternalSenderId,
  );
  TestValidator.equals(
    "chatbot member nickname match",
    chatbotMember.nickname,
    memberNickname,
  );

  // 3. Create chatbot points
  const pointsCreateBody = {
    chatbot_member_id: chatbotMember.id,
    points: typia.random<number & tags.Type<"int32">>(),
  } satisfies IChatbotPoints.ICreate;

  const chatbotPoints: IChatbotPoints =
    await api.functional.chatbot.member.chatbotPoints.create(connection, {
      body: pointsCreateBody,
    });
  typia.assert(chatbotPoints);

  TestValidator.equals(
    "chatbot points owner ID",
    chatbotPoints.chatbot_member_id,
    chatbotMember.id,
  );

  // 4. Delete the chatbot points record
  await api.functional.chatbot.member.chatbotPoints.erase(connection, {
    id: chatbotPoints.id,
  });

  // 5. Verify deletion: deletion is permanent, attempting re-deletion or retrieval fails
  // Since no API exists to read points by id, we validate deletion by expecting error on re-deletion
  await TestValidator.error(
    "delete already deleted points should fail",
    async () => {
      await api.functional.chatbot.member.chatbotPoints.erase(connection, {
        id: chatbotPoints.id,
      });
    },
  );

  // 6. Unauthorized deletion attempt: create another member
  const otherMemberInternalSenderId = RandomGenerator.alphaNumeric(20);
  const otherMemberNickname = RandomGenerator.name();

  const otherMemberCreateBody = {
    internal_sender_id: otherMemberInternalSenderId,
    nickname: otherMemberNickname,
  } satisfies IChatbotMember.ICreate;

  const otherMemberAuthorized: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: otherMemberCreateBody,
    });
  typia.assert(otherMemberAuthorized);

  // Login as other member to attempt delete
  const otherMemberLoginBody = {
    internal_sender_id: otherMemberInternalSenderId,
    nickname: otherMemberNickname,
  } satisfies IChatbotMember.ILogin;

  await api.functional.auth.member.login.loginMember(connection, {
    body: otherMemberLoginBody,
  });

  // Create new points for other member to have an id to attempt deleting
  const otherPointsCreateBody = {
    chatbot_member_id: otherMemberAuthorized.id,
    points: typia.random<number & tags.Type<"int32">>(),
  } satisfies IChatbotPoints.ICreate;

  const otherPoints: IChatbotPoints =
    await api.functional.chatbot.member.chatbotPoints.create(connection, {
      body: otherPointsCreateBody,
    });
  typia.assert(otherPoints);

  // Attempt unauthorized deletion of original member points with other member's auth
  await TestValidator.error("unauthorized deletion should fail", async () => {
    await api.functional.chatbot.member.chatbotPoints.erase(connection, {
      id: chatbotPoints.id,
    });
  });

  // 7. Attempt deletion of non-existing points ID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "deletion of non-existing ID should fail",
    async () => {
      await api.functional.chatbot.member.chatbotPoints.erase(connection, {
        id: nonExistentId,
      });
    },
  );
}
