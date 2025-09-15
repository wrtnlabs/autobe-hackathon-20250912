import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppMediaAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppMediaAttachment";
import type { IChatAppMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppMessage";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";

export async function test_api_chat_message_media_attachment_update(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a regular user
  const regularUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        social_login_id: RandomGenerator.alphaNumeric(10),
        nickname: RandomGenerator.name(),
        profile_image_uri: null,
      } satisfies IChatAppRegularUser.ICreate,
    });
  typia.assert(regularUser);

  // 2. Create a chat message by the regular user
  const message: IChatAppMessage =
    await api.functional.chatApp.regularUser.messages.create(connection, {
      body: {
        sender_id: regularUser.id,
        content: RandomGenerator.content({ paragraphs: 1 }),
        message_type: "text",
        group_id: null,
        recipient_id: null,
      } satisfies IChatAppMessage.ICreate,
    });
  typia.assert(message);

  // 3. Create media attachment linked to the message
  const mediaAttachment: IChatAppMediaAttachment =
    await api.functional.chatApp.regularUser.messages.mediaAttachments.createMediaAttachment(
      connection,
      {
        messageId: message.id,
        body: {
          message_id: message.id,
          media_type: RandomGenerator.pick(["image", "video"] as const),
          uri: `https://example.com/media/${RandomGenerator.alphaNumeric(8)}.jpg`,
        } satisfies IChatAppMediaAttachment.ICreate,
      },
    );
  typia.assert(mediaAttachment);

  // 4. Update the media attachment with valid new data
  const newMediaType =
    mediaAttachment.media_type === "image" ? "video" : "image";
  const newUri = `https://example.com/media/${RandomGenerator.alphaNumeric(8)}.mp4`;

  const updatedMediaAttachment: IChatAppMediaAttachment =
    await api.functional.chatApp.regularUser.messages.mediaAttachments.updateMediaAttachment(
      connection,
      {
        messageId: message.id,
        mediaAttachmentId: mediaAttachment.id,
        body: {
          media_type: newMediaType,
          uri: newUri,
        } satisfies IChatAppMediaAttachment.IUpdate,
      },
    );
  typia.assert(updatedMediaAttachment);

  TestValidator.equals(
    "media attachment id unchanged",
    updatedMediaAttachment.id,
    mediaAttachment.id,
  );
  TestValidator.equals(
    "media_type updated correctly",
    updatedMediaAttachment.media_type,
    newMediaType,
  );
  TestValidator.equals(
    "uri updated correctly",
    updatedMediaAttachment.uri,
    newUri,
  );

  // 5. Negative tests - attempt update with invalid media_type (wrong enum) - skipped due to type safety enforcement

  // 6. Negative tests - attempt update with invalid uri (malformed) - test with business logic error if possible
  await TestValidator.error("update fails with invalid uri", async () => {
    await api.functional.chatApp.regularUser.messages.mediaAttachments.updateMediaAttachment(
      connection,
      {
        messageId: message.id,
        mediaAttachmentId: mediaAttachment.id,
        body: {
          uri: "not-a-valid-uri",
        } satisfies IChatAppMediaAttachment.IUpdate,
      },
    );
  });

  // 7. Negative test - unauthorized update attempt (simulate by creating another user and trying to update previous user's attachment)
  const anotherUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        social_login_id: RandomGenerator.alphaNumeric(10),
        nickname: RandomGenerator.name(),
        profile_image_uri: null,
      } satisfies IChatAppRegularUser.ICreate,
    });
  typia.assert(anotherUser);

  // Attempt updateMediaAttachment with anotherUser's credentials by first logging in as anotherUser
  await TestValidator.error(
    "unauthorized user cannot update media attachment",
    async () => {
      // Login as another user (simulate by calling join again; in real cases login API)
      await api.functional.auth.regularUser.join(connection, {
        body: {
          social_login_id: anotherUser.social_login_id,
          nickname: anotherUser.nickname,
          profile_image_uri: anotherUser.profile_image_uri,
        } satisfies IChatAppRegularUser.ICreate,
      });

      await api.functional.chatApp.regularUser.messages.mediaAttachments.updateMediaAttachment(
        connection,
        {
          messageId: message.id,
          mediaAttachmentId: mediaAttachment.id,
          body: {
            uri: `https://example.com/malicious/${RandomGenerator.alphaNumeric(8)}.jpg`,
          } satisfies IChatAppMediaAttachment.IUpdate,
        },
      );
    },
  );
}
