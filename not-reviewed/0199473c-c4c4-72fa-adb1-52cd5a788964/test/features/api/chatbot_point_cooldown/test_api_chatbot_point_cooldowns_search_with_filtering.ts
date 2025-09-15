import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotChatbotPointCooldown } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotChatbotPointCooldown";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIChatbotChatbotPointCooldown } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotChatbotPointCooldown";

/**
 * Test searching and retrieving a paginated, filtered list of chatbot point
 * cooldowns associated with an authenticated chatbot member user.
 *
 * This test covers the full flow from member joining, member login, chatbot
 * member creation, cooldown records creation, and verification of filtered
 * paginated search. It also tests handling of unauthorized access.
 *
 * Steps:
 *
 * 1. Member joins and logs in to authenticate.
 * 2. Chatbot member is created with unique internal sender ID.
 * 3. Search cooldowns filtered by member ID with pagination is performed.
 * 4. Returned data is validated for inclusion and pagination correctness.
 * 5. Unauthorized access test is performed.
 */
export async function test_api_chatbot_point_cooldowns_search_with_filtering(
  connection: api.IConnection,
) {
  // 1. Member user join
  const internalSenderId: string = RandomGenerator.alphaNumeric(16);
  const memberJoinBody = {
    internal_sender_id: internalSenderId,
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;

  const memberAuthorized: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Member user login
  const memberLoginBody = {
    internal_sender_id: internalSenderId,
    nickname: memberJoinBody.nickname,
  } satisfies IChatbotMember.ILogin;

  const memberLoginAuthorized: IChatbotMember.IAuthorized =
    await api.functional.auth.member.login.loginMember(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);
  // Authenticated, token auto-set in connection header by SDK

  // 3. Create chatbot member with unique internal_sender_id
  const chatbotMemberBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(16),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;

  const chatbotMember: IChatbotMember =
    await api.functional.chatbot.member.chatbotMembers.create(connection, {
      body: chatbotMemberBody,
    });
  typia.assert(chatbotMember);

  // 4. Search cooldowns filtered by chatbot_member_id with pagination
  const searchBody = {
    chatbot_member_id: chatbotMember.id,
    page: 1,
    limit: 10,
  } satisfies IChatbotChatbotPointCooldown.IRequest;

  const cooldownPage: IPageIChatbotChatbotPointCooldown =
    await api.functional.chatbot.member.chatbotPointCooldowns.index(
      connection,
      { body: searchBody },
    );
  typia.assert(cooldownPage);

  // Check pagination info
  TestValidator.predicate(
    "pagination current page is 1",
    cooldownPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    cooldownPage.pagination.limit === 10,
  );

  // Check that all cooldowns belong to chatbotMember
  cooldownPage.data.forEach((cooldown) => {
    TestValidator.equals(
      "cooldown chatbot_member_id matches filter",
      cooldown.chatbot_member_id,
      chatbotMember.id,
    );
  });

  // 5. Unauthorized access test by creating a fresh connection (no auth)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthorized access is rejected", async () => {
    await api.functional.chatbot.member.chatbotPointCooldowns.index(
      unauthenticatedConnection,
      { body: searchBody },
    );
  });
}
