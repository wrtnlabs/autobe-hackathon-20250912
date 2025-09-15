import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import type { IStoryfieldAiStoryImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryImage";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * This test validates that a system administrator can successfully access
 * detailed metadata for a story image created under a specific AI-generated
 * story, and that access to this metadata is restricted appropriately. The test
 * follows a multi-actor flow:
 *
 * 1. Register and log in as a system administrator
 * 2. Register and log in as an authenticated user to create the parent story
 * 3. The authenticated user creates a new AI-generated story
 * 4. Swap back to the system administrator and upload an image to the created
 *    story
 * 5. Retrieve the image detail with system admin credentials, validating all
 *    metadata (uri, description, references, audit fields, no deletion)
 * 6. Attempt to fetch details with a non-existent image ID to ensure error
 *    response and access control is correct
 */
export async function test_api_systemadmin_story_image_detail_access_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const adminInfo = {
    external_admin_id: RandomGenerator.alphaNumeric(12),
    email: `${RandomGenerator.alphaNumeric(8)}@admin.com`,
    actor_type: "systemAdmin" as const,
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: adminInfo,
  });
  typia.assert(admin);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: adminInfo.external_admin_id,
      email: adminInfo.email,
    },
  });

  // 2. Register and login as authenticatedUser
  const userInfo = {
    external_user_id: RandomGenerator.alphaNumeric(14),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    actor_type: "authenticatedUser" as const,
  } satisfies IStoryfieldAiAuthenticatedUser.ICreate;
  const user = await api.functional.auth.authenticatedUser.join(connection, {
    body: userInfo,
  });
  typia.assert(user);

  await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: userInfo.external_user_id,
      email: userInfo.email,
    },
  });

  // 3. Create a new story as authenticated user
  const storyBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    main_plot: RandomGenerator.paragraph({ sentences: 5 }),
    language: RandomGenerator.pick([
      "ko-KR",
      "en",
      "fr",
      "jp",
      "zh-CN",
    ] as const),
  } satisfies IStoryfieldAiStory.ICreate;
  const story =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      { body: storyBody },
    );
  typia.assert(story);

  // 4. Switch to systemAdmin session
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: adminInfo.external_admin_id,
      email: adminInfo.email,
    },
  });

  // 5. Add an image to the created story as systemAdmin
  const imageBody = {
    storyfield_ai_story_id: story.id,
    image_uri: `https://s3.example.com/${RandomGenerator.alphaNumeric(16)}.png`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IStoryfieldAiStoryImage.ICreate;
  const image =
    await api.functional.storyfieldAi.systemAdmin.stories.images.create(
      connection,
      {
        storyId: story.id,
        body: imageBody,
      },
    );
  typia.assert(image);

  // 6. Fetch image detail using systemAdmin API
  const imageDetail =
    await api.functional.storyfieldAi.systemAdmin.stories.images.at(
      connection,
      {
        storyId: story.id,
        imageId: image.id,
      },
    );
  typia.assert(imageDetail);
  TestValidator.equals(
    "image URI should match",
    imageDetail.image_uri,
    imageBody.image_uri,
  );
  TestValidator.equals(
    "description should match",
    imageDetail.description,
    imageBody.description,
  );
  TestValidator.equals("image id matches", imageDetail.id, image.id);
  TestValidator.equals(
    "parent story id matches",
    imageDetail.storyfield_ai_story_id,
    story.id,
  );
  TestValidator.equals("not deleted", imageDetail.deleted_at, null);

  // 7. Try to fetch image details with invalid image id - expect error
  const bogusImageId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error("should fail on nonexistent image id", async () => {
    await api.functional.storyfieldAi.systemAdmin.stories.images.at(
      connection,
      {
        storyId: story.id,
        imageId: bogusImageId,
      },
    );
  });
}
