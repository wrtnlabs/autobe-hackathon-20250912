import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import type { IChatbotPoints } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotPoints";

/**
 * End-to-end test for updating chatbot points with valid data.
 *
 * This test performs the full workflow of:
 *
 * 1. Member user joins the system to create a user context.
 * 2. Member user logs in to gain authorization.
 * 3. Creation of a new chatbot member with unique internal sender ID.
 * 4. Creation of initial chatbot points record associated with the chatbot
 *    member.
 * 5. Update of the chatbot points record's points value with valid data.
 * 6. Validation that the updated response reflects the changes correctly.
 * 7. Confirm the updated points are non-negative and match expected values.
 * 8. Test error scenarios such as updating with an invalid ID and unauthorized
 *    update attempt.
 *
 * The test uses typia for perfect runtime type validation and TestValidator
 * for business logic assertions. Authentication tokens are handled
 * transparently by the API client.
 */
export async function test_api_chatbot_points_update_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Member user joins
  const memberCreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;
  const member: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);

  // 2. Member user logs in with same credentials
  const memberLoginBody = {
    internal_sender_id: member.internal_sender_id,
    nickname: member.nickname,
  } satisfies IChatbotMember.ILogin;
  const loginResult: IChatbotMember.IAuthorized =
    await api.functional.auth.member.login.loginMember(connection, {
      body: memberLoginBody,
    });
  typia.assert(loginResult);

  // 3. Create chatbot member user explicitly
  const chatbotMemberBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;
  const chatbotMember: IChatbotMember =
    await api.functional.chatbot.member.chatbotMembers.create(connection, {
      body: chatbotMemberBody,
    });
  typia.assert(chatbotMember);

  // 4. Create initial chatbot points record for the new member
  const initialPoints = Math.floor(Math.random() * 1000) + 1;
  const chatbotPointsCreateBody = {
    chatbot_member_id: chatbotMember.id,
    points: initialPoints,
  } satisfies IChatbotPoints.ICreate;
  const chatbotPoints: IChatbotPoints =
    await api.functional.chatbot.member.chatbotPoints.create(connection, {
      body: chatbotPointsCreateBody,
    });
  typia.assert(chatbotPoints);
  TestValidator.equals(
    "initial points values equal",
    chatbotPoints.points,
    initialPoints,
  );
  TestValidator.equals(
    "chatbot member id linked",
    chatbotPoints.chatbot_member_id,
    chatbotMember.id,
  );

  // 5. Update the chatbot points record with a new valid points value
  const updatedPointsValue =
    initialPoints + Math.floor(Math.random() * 500) + 1;
  const chatbotPointsUpdateBody = {
    points: updatedPointsValue,
  } satisfies IChatbotPoints.IUpdate;
  const updatedChatbotPoints: IChatbotPoints =
    await api.functional.chatbot.member.chatbotPoints.update(connection, {
      id: chatbotPoints.id,
      body: chatbotPointsUpdateBody,
    });
  typia.assert(updatedChatbotPoints);

  // 6. Validate the updated points reflect correctly
  TestValidator.equals(
    "updated points should match",
    updatedChatbotPoints.points,
    updatedPointsValue,
  );
  TestValidator.equals(
    "chatbot member id unchanged",
    updatedChatbotPoints.chatbot_member_id,
    chatbotPoints.chatbot_member_id,
  );
  TestValidator.predicate(
    "points value non-negative",
    updatedChatbotPoints.points >= 0,
  );
  TestValidator.predicate(
    "updated_at is different after update",
    updatedChatbotPoints.updated_at !== chatbotPoints.updated_at,
  );

  // 7. Attempt to update with invalid id - expect error
  await TestValidator.error(
    "Update fails with non-existent points ID",
    async () => {
      await api.functional.chatbot.member.chatbotPoints.update(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: { points: 123 } satisfies IChatbotPoints.IUpdate,
      });
    },
  );

  // 8. Attempt unauthorized update by switching to new member login
  const member2CreateBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;
  const member2: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: member2CreateBody,
    });
  typia.assert(member2);

  const member2LoginBody = {
    internal_sender_id: member2.internal_sender_id,
    nickname: member2.nickname,
  } satisfies IChatbotMember.ILogin;
  const loginResult2: IChatbotMember.IAuthorized =
    await api.functional.auth.member.login.loginMember(connection, {
      body: member2LoginBody,
    });
  typia.assert(loginResult2);

  await TestValidator.error("Unauthorized update attempt fails", async () => {
    await api.functional.chatbot.member.chatbotPoints.update(connection, {
      id: chatbotPoints.id,
      body: { points: 200 } satisfies IChatbotPoints.IUpdate,
    });
  });
}
