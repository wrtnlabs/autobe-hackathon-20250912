import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotChatbotPointCooldown } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotChatbotPointCooldown";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";

export async function test_api_chatbot_point_cooldown_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new chatbot member user (join)
  const joinBody = {
    internal_sender_id: RandomGenerator.alphaNumeric(16),
    nickname: RandomGenerator.name(),
  } satisfies IChatbotMember.ICreate;
  const memberAuthorized: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: joinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Login with the joined member credentials
  const loginBody = {
    internal_sender_id: memberAuthorized.internal_sender_id,
    nickname: memberAuthorized.nickname,
  } satisfies IChatbotMember.ILogin;
  const loginAuthorized: IChatbotMember.IAuthorized =
    await api.functional.auth.member.login.loginMember(connection, {
      body: loginBody,
    });
  typia.assert(loginAuthorized);

  // 3. Create a chatbot member linked to authenticated member context
  // Use same internal_sender_id and nickname to mimic creation
  const chatbotCreateBody = {
    internal_sender_id: loginAuthorized.internal_sender_id,
    nickname: loginAuthorized.nickname,
  } satisfies IChatbotMember.ICreate;
  const chatbotMember: IChatbotMember =
    await api.functional.chatbot.member.chatbotMembers.create(connection, {
      body: chatbotCreateBody,
    });
  typia.assert(chatbotMember);

  // 4. Test unauthorized access: create unauthenticated connection
  const unauthenticatedConn: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  await TestValidator.error("unauthorized access should fail", async () => {
    // Use randomly generated cooldown ID since no valid cooldown exists
    await api.functional.chatbot.member.chatbotPointCooldowns.at(
      unauthenticatedConn,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // 5. Test retrieval with non-existent cooldown ID with authenticated connection
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent cooldown ID should cause error",
    async () => {
      await api.functional.chatbot.member.chatbotPointCooldowns.at(connection, {
        id: nonExistentId,
      });
    },
  );
}
