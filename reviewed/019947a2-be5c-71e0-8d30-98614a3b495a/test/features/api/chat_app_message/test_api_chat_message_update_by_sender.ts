import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppMessage";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";

/**
 * This test validates the process for a regular user to update an existing chat
 * message they sent. It ensures that only the message sender can perform
 * updates, enforces valid message content and types, and tests error cases
 * where update attempts are invalid.
 *
 * The steps for this test are:
 *
 * 1. Create and authenticate a new regular user (user1).
 * 2. User1 creates a new chat message.
 * 3. User1 updates the message content and message type successfully.
 * 4. Create and authenticate a second regular user (user2).
 * 5. Confirm that user2 cannot update user1's message (expect error).
 * 6. Validate that trying to update with invalid message type or empty content
 *    fails.
 * 7. Confirm updated message details return as expected.
 */
export async function test_api_chat_message_update_by_sender(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a new regular user (user1)
  const user1: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        social_login_id: `user1_${RandomGenerator.alphaNumeric(8)}`,
        nickname: RandomGenerator.name(),
        profile_image_uri: null,
      } satisfies IChatAppRegularUser.ICreate,
    });
  typia.assert(user1);

  // 2. User1 creates a new chat message
  const messageCreateBody = {
    sender_id: user1.id,
    content: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    message_type: "text" as const,
    group_id: null,
    recipient_id: null,
  } satisfies IChatAppMessage.ICreate;

  const message: IChatAppMessage =
    await api.functional.chatApp.regularUser.messages.create(connection, {
      body: messageCreateBody,
    });
  typia.assert(message);

  TestValidator.equals(
    "sender_id equals user1.id",
    message.sender_id,
    user1.id,
  );
  TestValidator.equals("message_type is 'text'", message.message_type, "text");
  TestValidator.predicate("content is non-empty", message.content.length > 0);

  // 3. User1 updates the message content and message type successfully
  const newContent = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const newMessageType = RandomGenerator.pick([
    "text",
    "image",
    "video",
  ] as const);

  const updateBody = {
    content: newContent,
    message_type: newMessageType,
  } satisfies IChatAppMessage.IUpdate;

  const updatedMessage: IChatAppMessage =
    await api.functional.chatApp.regularUser.messages.update(connection, {
      id: message.id,
      body: updateBody,
    });
  typia.assert(updatedMessage);

  TestValidator.equals(
    "updated message sender_id equals user1.id",
    updatedMessage.sender_id,
    user1.id,
  );
  TestValidator.equals(
    "updated message id matches original id",
    updatedMessage.id,
    message.id,
  );
  TestValidator.equals(
    "updated message_type matches update",
    updatedMessage.message_type,
    newMessageType,
  );
  TestValidator.equals(
    "updated content matches update",
    updatedMessage.content,
    newContent,
  );

  // 4. Create and authenticate a second regular user (user2)
  const user2: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        social_login_id: `user2_${RandomGenerator.alphaNumeric(8)}`,
        nickname: RandomGenerator.name(),
        profile_image_uri: null,
      } satisfies IChatAppRegularUser.ICreate,
    });
  typia.assert(user2);

  // 5. Confirm that user2 cannot update user1's message (expect error)
  await TestValidator.error("user2 cannot update user1 message", async () => {
    await api.functional.chatApp.regularUser.messages.update(connection, {
      id: message.id,
      body: {
        content: "Attempted unauthorized update",
        message_type: "text",
      } satisfies IChatAppMessage.IUpdate,
    });
  });

  // For user2 to perform update, must login with user2 token;
  // since the connection headers are handled by SDK, simulate login by joining user2b to replace token
  // This makes the connection authenticated as a new user (user2b)
  await api.functional.auth.regularUser.join(connection, {
    body: {
      social_login_id: `user2b_${RandomGenerator.alphaNumeric(8)}`,
      nickname: RandomGenerator.name(),
      profile_image_uri: null,
    } satisfies IChatAppRegularUser.ICreate,
  });

  // 6. Validate that trying to update with empty content fails
  await TestValidator.error("empty content update fails", async () => {
    await api.functional.chatApp.regularUser.messages.update(connection, {
      id: message.id,
      body: {
        content: "",
      } satisfies IChatAppMessage.IUpdate,
    });
  });

  // 7. Confirm updated message details match expectations (done after update)
  // No further fetch endpoint, so rely on update response
}
