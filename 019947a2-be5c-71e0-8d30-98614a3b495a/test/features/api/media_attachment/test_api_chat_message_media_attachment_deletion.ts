import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppMediaAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppMediaAttachment";
import type { IChatAppMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppMessage";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";

/**
 * E2E test for media attachment deletion in chat messages.
 *
 * This test authenticates a regular user, creates a chat message, attaches
 * media to that message, deletes the media attachment, validates that
 * deleting the same attachment again raises an error, and tests that
 * unauthorized user deletion attempts are rejected.
 *
 * The test ensures authorization enforcement and proper media attachment
 * lifecycle management.
 */
export async function test_api_chat_message_media_attachment_deletion(
  connection: api.IConnection,
) {
  // 1. Authenticate first regular user
  const firstUserCreate = {
    social_login_id: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    profile_image_uri: null,
  } satisfies IChatAppRegularUser.ICreate;

  const firstUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: firstUserCreate,
    });
  typia.assert(firstUser);

  // 2. Create a chat message for first user
  const messageCreate = {
    sender_id: firstUser.id,
    content: RandomGenerator.paragraph({ sentences: 5 }),
    message_type: "image",
    group_id: null,
    recipient_id: null,
  } satisfies IChatAppMessage.ICreate;

  const message: IChatAppMessage =
    await api.functional.chatApp.regularUser.messages.create(connection, {
      body: messageCreate,
    });
  typia.assert(message);

  // 3. Create a media attachment linked to the chat message
  const mediaAttachmentCreate = {
    message_id: message.id,
    media_type: "image",
    uri: `https://media.example.com/${RandomGenerator.alphaNumeric(20)}.png`,
  } satisfies IChatAppMediaAttachment.ICreate;

  const mediaAttachment: IChatAppMediaAttachment =
    await api.functional.chatApp.regularUser.messages.mediaAttachments.createMediaAttachment(
      connection,
      {
        messageId: message.id,
        body: mediaAttachmentCreate,
      },
    );
  typia.assert(mediaAttachment);

  // 4. Delete the media attachment
  await api.functional.chatApp.regularUser.messages.mediaAttachments.eraseMediaAttachment(
    connection,
    {
      messageId: message.id,
      mediaAttachmentId: mediaAttachment.id,
    },
  );

  // 5. Attempt to delete the same media attachment again - must fail
  await TestValidator.error(
    "deleting the same media attachment twice should fail",
    async () => {
      await api.functional.chatApp.regularUser.messages.mediaAttachments.eraseMediaAttachment(
        connection,
        {
          messageId: message.id,
          mediaAttachmentId: mediaAttachment.id,
        },
      );
    },
  );

  // 6. Authenticate second regular user as unauthorized actor
  const secondUserCreate = {
    social_login_id: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    profile_image_uri: null,
  } satisfies IChatAppRegularUser.ICreate;

  const secondUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: secondUserCreate,
    });
  typia.assert(secondUser);

  // 7. Unauthorized deletion attempt by second user must fail
  await TestValidator.error(
    "unauthorized deletion attempt should fail",
    async () => {
      await api.functional.chatApp.regularUser.messages.mediaAttachments.eraseMediaAttachment(
        connection,
        {
          messageId: message.id,
          mediaAttachmentId: mediaAttachment.id,
        },
      );
    },
  );
}
