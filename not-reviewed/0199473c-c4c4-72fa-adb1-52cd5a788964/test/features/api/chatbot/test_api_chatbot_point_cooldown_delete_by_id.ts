import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatbotAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotAdmin";
import type { IChatbotChatbotPointCooldown } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotChatbotPointCooldown";
import type { IChatbotMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatbotMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIChatbotChatbotPointCooldown } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatbotChatbotPointCooldown";

/**
 * This test scenario validates the deletion of a chatbot point cooldown record
 * by its UUID. It requires authenticating as an admin user to obtain
 * authorization tokens, creating a member user to associate with the cooldown
 * record, creating a chatbot member record, and listing existing point
 * cooldowns associated with that member. It then deletes a cooldown by ID,
 * verifies the deletion, and tests deletion of a non-existent cooldown ID to
 * confirm error handling.
 *
 * Test flow:
 *
 * 1. Admin signup and login to establish authorization
 * 2. Member signup and login
 * 3. Create a chatbot member entity
 * 4. Retrieve cooldowns filtered by member ID
 * 5. Delete an existing cooldown or random UUID
 * 6. Confirm deletion by verifying absence in the cooldown list
 * 7. Attempt deletion of a random, non-existent cooldown ID and expect error
 */
export async function test_api_chatbot_point_cooldown_delete_by_id(
  connection: api.IConnection,
) {
  // 1. Admin sign up
  const adminInternalSenderId = RandomGenerator.alphaNumeric(10);
  const adminNickname = RandomGenerator.name();
  const admin: IChatbotAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        internal_sender_id: adminInternalSenderId,
        nickname: adminNickname,
      } satisfies IChatbotAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // 2. Admin login
  await api.functional.auth.admin.login(connection, {
    body: {
      internal_sender_id: adminInternalSenderId,
      nickname: adminNickname,
    } satisfies IChatbotAdmin.ILogin,
  });

  // 3. Member sign up
  const memberInternalSenderId = RandomGenerator.alphaNumeric(10);
  const memberNickname = RandomGenerator.name();
  const member: IChatbotMember.IAuthorized =
    await api.functional.auth.member.join.joinMember(connection, {
      body: {
        internal_sender_id: memberInternalSenderId,
        nickname: memberNickname,
      } satisfies IChatbotMember.ICreate,
    });
  typia.assert(member);

  // 4. Member login
  await api.functional.auth.member.login.loginMember(connection, {
    body: {
      internal_sender_id: memberInternalSenderId,
      nickname: memberNickname,
    } satisfies IChatbotMember.ILogin,
  });

  // 5. Create chatbot member
  const chatbotMember: IChatbotMember =
    await api.functional.chatbot.member.chatbotMembers.create(connection, {
      body: {
        internal_sender_id: memberInternalSenderId,
        nickname: memberNickname,
      } satisfies IChatbotMember.ICreate,
    });
  typia.assert(chatbotMember);

  // 6. Retrieve list of chatbot point cooldowns with filter
  let page: IPageIChatbotChatbotPointCooldown =
    await api.functional.chatbot.member.chatbotPointCooldowns.index(
      connection,
      {
        body: {
          chatbot_member_id: chatbotMember.id,
        } satisfies IChatbotChatbotPointCooldown.IRequest,
      },
    );
  typia.assert(page);

  // 7. Select cooldown ID to delete
  const existingCooldown = page.data.find(
    (cooldown) => cooldown.chatbot_member_id === chatbotMember.id,
  );
  const cooldownIdToDelete: string =
    existingCooldown?.id ?? typia.random<string & tags.Format<"uuid">>();

  // 8. Delete the cooldown by ID
  await api.functional.chatbot.admin.chatbotPointCooldowns.erase(connection, {
    id: cooldownIdToDelete,
  });

  // 9. Validate deletion by fetching cooldowns again and confirming absence
  page = await api.functional.chatbot.member.chatbotPointCooldowns.index(
    connection,
    {
      body: {
        chatbot_member_id: chatbotMember.id,
      } satisfies IChatbotChatbotPointCooldown.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.predicate(
    "deleted cooldown is removed",
    !page.data.some((c) => c.id === cooldownIdToDelete),
  );

  // 10. Try deleting a non-existent cooldown ID to test error response
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "delete non-existent cooldown should fail",
    async () => {
      await api.functional.chatbot.admin.chatbotPointCooldowns.erase(
        connection,
        {
          id: nonExistentId,
        },
      );
    },
  );
}
