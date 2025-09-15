import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IChatAppMediaAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppMediaAttachment";
import type { IChatAppMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppMessage";
import type { IChatAppMessageMediaAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppMessageMediaAttachment";
import type { IChatAppRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IChatAppRegularUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIChatAppMessageMediaAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIChatAppMessageMediaAttachment";

/**
 * Tests listing media attachments of a chat message for an authenticated
 * regular user, validating filtering by media type and pagination.
 *
 * This test performs the following sequence:
 *
 * 1. Creates and authenticates a regular user.
 * 2. Creates a chat message by the authenticated user.
 * 3. Adds multiple media attachments (image and video) to the message.
 * 4. Retrieves the full media attachment list for the message without filters.
 * 5. Retrieves filtered lists by "image" and "video" media types.
 * 6. Verifies pagination behavior and metadata correctness.
 *
 * The test asserts the correctness of filtering by media_type, pagination
 * parameters, response metadata, and data consistency. All API responses
 * are validated using typia.assert. TestValidator validates expected
 * conditions with descriptive messages.
 *
 * This scenario ensures the PATCH
 * /chatApp/regularUser/messages/{messageId}/mediaAttachments endpoint
 * correctly implements filtering and pagination logic with proper
 * authorization.
 */
export async function test_api_chat_message_media_attachments_list_with_filters(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a regular user
  const authorizedUser: IChatAppRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: {
        social_login_id: RandomGenerator.alphaNumeric(10),
        nickname: RandomGenerator.name(),
        profile_image_uri: null,
      } satisfies IChatAppRegularUser.ICreate,
    });
  typia.assert(authorizedUser);

  // 2. Create a chat message
  const messageContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const message: IChatAppMessage =
    await api.functional.chatApp.regularUser.messages.create(connection, {
      body: {
        sender_id: authorizedUser.id,
        group_id: null,
        recipient_id: null,
        content: messageContent,
        message_type: "text",
      } satisfies IChatAppMessage.ICreate,
    });
  typia.assert(message);

  // 3. Create multiple media attachments for the message
  const mediaAttachments: IChatAppMediaAttachment[] = [];

  // Create 3 image attachments
  for (let i = 0; i < 3; ++i) {
    const imageUri = `https://example.com/images/${RandomGenerator.alphaNumeric(8)}.jpg`;
    const mediaAttachment =
      await api.functional.chatApp.regularUser.messages.mediaAttachments.createMediaAttachment(
        connection,
        {
          messageId: message.id,
          body: {
            message_id: message.id,
            media_type: "image",
            uri: imageUri,
          } satisfies IChatAppMediaAttachment.ICreate,
        },
      );
    typia.assert(mediaAttachment);
    mediaAttachments.push(mediaAttachment);
  }

  // Create 2 video attachments
  for (let i = 0; i < 2; ++i) {
    const videoUri = `https://example.com/videos/${RandomGenerator.alphaNumeric(8)}.mp4`;
    const mediaAttachment =
      await api.functional.chatApp.regularUser.messages.mediaAttachments.createMediaAttachment(
        connection,
        {
          messageId: message.id,
          body: {
            message_id: message.id,
            media_type: "video",
            uri: videoUri,
          } satisfies IChatAppMediaAttachment.ICreate,
        },
      );
    typia.assert(mediaAttachment);
    mediaAttachments.push(mediaAttachment);
  }

  // 4. Retrieve media attachments with filters and pagination

  // 4.1 Retrieve all attachments without filter
  const fullList: IPageIChatAppMessageMediaAttachment =
    await api.functional.chatApp.regularUser.messages.mediaAttachments.index(
      connection,
      {
        messageId: message.id,
        body: {
          page: 1,
          limit: 10,
          filter: { message_id: message.id, media_type: null },
          search: null,
          orderBy: null,
        } satisfies IChatAppMessageMediaAttachment.IRequest,
      },
    );
  typia.assert(fullList);

  TestValidator.predicate(
    "full list contains all media attachments",
    fullList.data.length === mediaAttachments.length,
  );

  // 4.2 Retrieve only image attachments
  const imageList: IPageIChatAppMessageMediaAttachment =
    await api.functional.chatApp.regularUser.messages.mediaAttachments.index(
      connection,
      {
        messageId: message.id,
        body: {
          page: 1,
          limit: 10,
          filter: { message_id: message.id, media_type: "image" },
          search: null,
          orderBy: null,
        } satisfies IChatAppMessageMediaAttachment.IRequest,
      },
    );
  typia.assert(imageList);

  const expectedImageCount = mediaAttachments.filter(
    (m) => m.media_type === "image",
  ).length;

  TestValidator.equals(
    "filtered list count equals number of image media",
    imageList.data.length,
    expectedImageCount,
  );

  for (const item of imageList.data) {
    TestValidator.equals(
      "each item media_type is image",
      item.media_type,
      "image",
    );
  }

  // 4.3 Retrieve only video attachments with limit 1
  const videoListPage1: IPageIChatAppMessageMediaAttachment =
    await api.functional.chatApp.regularUser.messages.mediaAttachments.index(
      connection,
      {
        messageId: message.id,
        body: {
          page: 1,
          limit: 1,
          filter: { message_id: message.id, media_type: "video" },
          search: null,
          orderBy: "created_at DESC",
        } satisfies IChatAppMessageMediaAttachment.IRequest,
      },
    );
  typia.assert(videoListPage1);

  TestValidator.predicate(
    "videoListPage1 retrieves only one video due to limit",
    videoListPage1.data.length === 1,
  );

  for (const item of videoListPage1.data) {
    TestValidator.equals(
      "videoListPage1 item media_type is video",
      item.media_type,
      "video",
    );
  }

  // 4.4 Retrieve video attachments page 2
  const videoListPage2: IPageIChatAppMessageMediaAttachment =
    await api.functional.chatApp.regularUser.messages.mediaAttachments.index(
      connection,
      {
        messageId: message.id,
        body: {
          page: 2,
          limit: 1,
          filter: { message_id: message.id, media_type: "video" },
          search: null,
          orderBy: "created_at DESC",
        } satisfies IChatAppMessageMediaAttachment.IRequest,
      },
    );
  typia.assert(videoListPage2);

  TestValidator.predicate(
    "videoListPage2 retrieves next video due to pagination",
    videoListPage2.data.length === 1,
  );

  for (const item of videoListPage2.data) {
    TestValidator.equals(
      "videoListPage2 item media_type is video",
      item.media_type,
      "video",
    );
  }

  // 4.5 Total video count matches expected
  const expectedVideoCount = mediaAttachments.filter(
    (m) => m.media_type === "video",
  ).length;

  TestValidator.predicate(
    "pagination metadata total records matches video count",
    videoListPage1.pagination.records === expectedVideoCount,
  );

  TestValidator.predicate(
    "pagination metadata on page 2 is valid",
    videoListPage2.pagination.current === 2 &&
      videoListPage2.pagination.limit === 1 &&
      videoListPage2.pagination.records === expectedVideoCount &&
      videoListPage2.pagination.pages === expectedVideoCount,
  );
}
