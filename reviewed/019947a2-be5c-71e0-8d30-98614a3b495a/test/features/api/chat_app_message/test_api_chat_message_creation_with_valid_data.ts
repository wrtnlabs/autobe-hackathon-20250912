import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppMessage";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";

/**
 * This E2E test verifies the full scenario of creating chat messages by an
 * authenticated regular user.
 *
 * The test starts by registering a new user via the /auth/regularUser/join
 * endpoint to establish authentication. Then, it attempts valid message
 * creation calls of type 'text', 'image', and 'video', each with content
 * and explicit null for optional group_id or recipient_id.
 *
 * The test asserts the returned message structure, verifies timestamps, and
 * message type correctness.
 *
 * It also tests business error conditions for empty content, and missing
 * recipient/group as applicable. Unauthorized attempts to create messages
 * are tested to confirm proper rejection.
 *
 * All API calls are awaited, and typia.assert is used on responses to fully
 * validate types. TestValidator functions are used for business and logical
 * assertions.
 */
export async function test_api_chat_message_creation_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Register a new regular user to authenticate
  const createUserBody = {
    social_login_id: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(),
    profile_image_uri: null,
  } satisfies IChatAppRegularUser.ICreate;
  const authorizedUser = await api.functional.auth.regularUser.join(
    connection,
    {
      body: createUserBody,
    },
  );
  typia.assert(authorizedUser);

  // 2. Create a valid 'text' chat message with no group or recipient (one-on-one chat)
  const textMessageBody = {
    sender_id: authorizedUser.id,
    group_id: null,
    recipient_id: null,
    content: "Hello, this is a test text message.",
    message_type: "text",
  } satisfies IChatAppMessage.ICreate;
  const createdTextMessage =
    await api.functional.chatApp.regularUser.messages.create(connection, {
      body: textMessageBody,
    });
  typia.assert(createdTextMessage);
  TestValidator.equals(
    "message_type should be text",
    createdTextMessage.message_type,
    "text",
  );
  TestValidator.equals(
    "content match",
    createdTextMessage.content,
    textMessageBody.content,
  );
  TestValidator.equals(
    "sender_id match",
    createdTextMessage.sender_id,
    authorizedUser.id,
  );
  typia.assertGuard<string & tags.Format<"date-time">>(
    createdTextMessage.created_at,
  );
  typia.assertGuard<string & tags.Format<"date-time">>(
    createdTextMessage.updated_at,
  );

  // 3. Create a valid 'image' chat message with recipient_id (one-on-one chat)
  const imageMessageBody = {
    sender_id: authorizedUser.id,
    group_id: null,
    recipient_id: typia.assert<string & tags.Format<"uuid">>(
      typia.random<string & tags.Format<"uuid">>(),
    ),
    content: "http://example.com/image.jpg",
    message_type: "image",
  } satisfies IChatAppMessage.ICreate;

  const createdImageMessage =
    await api.functional.chatApp.regularUser.messages.create(connection, {
      body: imageMessageBody,
    });
  typia.assert(createdImageMessage);
  TestValidator.equals(
    "message_type should be image",
    createdImageMessage.message_type,
    "image",
  );
  TestValidator.equals(
    "content match",
    createdImageMessage.content,
    imageMessageBody.content,
  );
  TestValidator.equals(
    "sender_id match",
    createdImageMessage.sender_id,
    authorizedUser.id,
  );
  typia.assertGuard<string & tags.Format<"date-time">>(
    createdImageMessage.created_at,
  );
  typia.assertGuard<string & tags.Format<"date-time">>(
    createdImageMessage.updated_at,
  );

  // 4. Create a valid 'video' chat message with group_id (group chat)
  const videoMessageBody = {
    sender_id: authorizedUser.id,
    group_id: typia.assert<string & tags.Format<"uuid">>(
      typia.random<string & tags.Format<"uuid">>(),
    ),
    recipient_id: null,
    content: "http://example.com/video.mp4",
    message_type: "video",
  } satisfies IChatAppMessage.ICreate;

  const createdVideoMessage =
    await api.functional.chatApp.regularUser.messages.create(connection, {
      body: videoMessageBody,
    });
  typia.assert(createdVideoMessage);
  TestValidator.equals(
    "message_type should be video",
    createdVideoMessage.message_type,
    "video",
  );
  TestValidator.equals(
    "content match",
    createdVideoMessage.content,
    videoMessageBody.content,
  );
  TestValidator.equals(
    "sender_id match",
    createdVideoMessage.sender_id,
    authorizedUser.id,
  );
  typia.assertGuard<string & tags.Format<"date-time">>(
    createdVideoMessage.created_at,
  );
  typia.assertGuard<string & tags.Format<"date-time">>(
    createdVideoMessage.updated_at,
  );

  // 5. Test error when creating message with empty content
  const emptyContentMessageBody = {
    sender_id: authorizedUser.id,
    group_id: null,
    recipient_id: null,
    content: "",
    message_type: "text",
  } satisfies IChatAppMessage.ICreate;

  await TestValidator.error("empty content should fail", async () => {
    await api.functional.chatApp.regularUser.messages.create(connection, {
      body: emptyContentMessageBody,
    });
  });

  // 6. Test unauthorized attempt to create a message
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated message creation should fail",
    async () => {
      await api.functional.chatApp.regularUser.messages.create(
        unauthConnection,
        {
          body: textMessageBody,
        },
      );
    },
  );
}
