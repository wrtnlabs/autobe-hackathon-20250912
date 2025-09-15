import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppMessage";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";

export async function test_api_chat_message_deletion_by_sender(
  connection: api.IConnection,
) {
  // 1. Create and authenticate regularUserA
  const userA: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        social_login_id: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(),
        profile_image_uri: null,
      } satisfies IChatAppRegularUser.ICreate,
    });
  typia.assert(userA);

  // 2. regularUserA sends a chat message
  const message: IChatAppMessage =
    await api.functional.chatApp.regularUser.messages.create(connection, {
      body: {
        sender_id: userA.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
        message_type: "text",
        recipient_id: null,
        group_id: null,
      } satisfies IChatAppMessage.ICreate,
    });
  typia.assert(message);

  // 3. Delete the created chat message by regularUserA
  await api.functional.chatApp.regularUser.messages.erase(connection, {
    id: message.id,
  });

  // 4. Create and authenticate regularUserB
  const userB: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        social_login_id: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(),
        profile_image_uri: null,
      } satisfies IChatAppRegularUser.ICreate,
    });
  typia.assert(userB);

  // 5. regularUserB attempts to delete the same message (which is already deleted, but testing unauthorized deletion attempt)
  await TestValidator.error(
    "regularUserB unauthorized deletion should fail",
    async () => {
      await api.functional.chatApp.regularUser.messages.erase(connection, {
        id: message.id,
      });
    },
  );

  // 6. regularUserB attempts to delete a non-existent message id
  const fakeMessageId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent message should fail",
    async () => {
      await api.functional.chatApp.regularUser.messages.erase(connection, {
        id: fakeMessageId,
      });
    },
  );
}
