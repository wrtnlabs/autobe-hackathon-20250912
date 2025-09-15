import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppMediaAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppMediaAttachment";
import type { IChatAppMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppMessage";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";

/**
 * Validate the retrieval of media attachment details for a chat message by a
 * regular user.
 *
 * This test simulates the entire flow from user registration and login, message
 * creation, media attachment upload, and final retrieval of the media
 * attachment details. It verifies the payload correctness, data consistency
 * between created and retrieved objects, and validates correct access control
 * by attempting access with a unauthorized user.
 *
 * Steps:
 *
 * 1. Register and authenticate a new regular user.
 * 2. Create a chat message from the authenticated user.
 * 3. Upload a media attachment to the created message.
 * 4. Fetch the media attachment details.
 * 5. Verify the fetched media attachment matches the created one exactly.
 * 6. Register and authenticate a second user.
 * 7. Verify forbidden access when second user tries to fetch media attachment of
 *    the first user's message.
 */
export async function test_api_chat_message_media_attachment_retrieval(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new regular user
  const socialLoginId1 = `test_social_${RandomGenerator.alphaNumeric(8)}`;
  const nickname1 = RandomGenerator.name();
  const regularUser1: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        social_login_id: socialLoginId1,
        nickname: nickname1,
        profile_image_uri: null,
      } satisfies IChatAppRegularUser.ICreate,
    });
  typia.assert(regularUser1);

  // 2. Create a chat message for the authenticated user
  const messageContent = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 5,
    wordMax: 10,
  });
  const message1: IChatAppMessage =
    await api.functional.chatApp.regularUser.messages.create(connection, {
      body: {
        sender_id: regularUser1.id,
        group_id: null,
        recipient_id: null,
        content: messageContent,
        message_type: "image",
      } satisfies IChatAppMessage.ICreate,
    });
  typia.assert(message1);

  // 3. Create a media attachment linked to the chat message
  // Choose media_type matching message_type "image"
  const mediaUri = `https://example.com/media/${RandomGenerator.alphaNumeric(12)}.jpg`;
  const mediaAttachmentCreated: IChatAppMediaAttachment =
    await api.functional.chatApp.regularUser.messages.mediaAttachments.createMediaAttachment(
      connection,
      {
        messageId: message1.id,
        body: {
          message_id: message1.id,
          media_type: "image",
          uri: mediaUri,
        } satisfies IChatAppMediaAttachment.ICreate,
      },
    );
  typia.assert(mediaAttachmentCreated);

  // 4. Fetch the media attachment details by messageId and mediaAttachmentId
  const mediaAttachmentFetched: IChatAppMediaAttachment =
    await api.functional.chatApp.regularUser.messages.mediaAttachments.atMediaAttachment(
      connection,
      {
        messageId: message1.id,
        mediaAttachmentId: mediaAttachmentCreated.id,
      },
    );
  typia.assert(mediaAttachmentFetched);

  // 5. Validate the fetched media attachment matches the created one
  TestValidator.equals(
    "media attachment ID should match",
    mediaAttachmentFetched.id,
    mediaAttachmentCreated.id,
  );
  TestValidator.equals(
    "media attachment message_id should match",
    mediaAttachmentFetched.message_id,
    mediaAttachmentCreated.message_id,
  );
  TestValidator.equals(
    "media attachment media_type should match",
    mediaAttachmentFetched.media_type,
    mediaAttachmentCreated.media_type,
  );
  TestValidator.equals(
    "media attachment URI should match",
    mediaAttachmentFetched.uri,
    mediaAttachmentCreated.uri,
  );

  // 6. Register and authenticate a second regular user
  const socialLoginId2 = `test_social_${RandomGenerator.alphaNumeric(8)}`;
  const nickname2 = RandomGenerator.name();
  const connection2: api.IConnection = { ...connection, headers: {} };
  const regularUser2: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection2, {
      body: {
        social_login_id: socialLoginId2,
        nickname: nickname2,
        profile_image_uri: null,
      } satisfies IChatAppRegularUser.ICreate,
    });
  typia.assert(regularUser2);

  // 7. Attempt retrieval of the first user's media attachment using second user's auth
  await TestValidator.error(
    "second user cannot access first user's media attachment",
    async () => {
      await api.functional.chatApp.regularUser.messages.mediaAttachments.atMediaAttachment(
        connection2,
        {
          messageId: message1.id,
          mediaAttachmentId: mediaAttachmentCreated.id,
        },
      );
    },
  );
}
