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
 * Validates that a system admin can soft-delete any user story image for
 * moderation or compliance reasons.
 *
 * 1. Register and login as a system admin
 * 2. Register and login as an authenticated user
 * 3. User creates a new story
 * 4. User uploads an image to the story
 * 5. System admin logs in and deletes the image
 * 6. If an image read endpoint existed, we would fetch and check 'deleted_at' is
 *    set. (Here, we check no error is thrown, and business flow continues for
 *    the story owner.)
 */
export async function test_api_story_image_erase_by_admin_success(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const admin_external_id = RandomGenerator.alphaNumeric(10);
  const admin_email = `${RandomGenerator.alphabets(8)}@company.com`;
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      external_admin_id: admin_external_id,
      email: admin_email,
      actor_type: "systemAdmin",
    } satisfies IStoryfieldAiSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // (ensure we're authenticated as system admin)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: admin_external_id,
      email: admin_email,
    } satisfies IStoryfieldAiSystemAdmin.ILogin,
  });

  // 2. Register and login as authenticated user
  const user_external_id = RandomGenerator.alphaNumeric(10);
  const user_email = `${RandomGenerator.alphabets(8)}@user.com`;
  const userJoin = await api.functional.auth.authenticatedUser.join(
    connection,
    {
      body: {
        external_user_id: user_external_id,
        email: user_email,
        actor_type: "authenticatedUser",
      } satisfies IStoryfieldAiAuthenticatedUser.ICreate,
    },
  );
  typia.assert(userJoin);

  await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: user_external_id,
      email: user_email,
    } satisfies IStoryfieldAiAuthenticatedUser.ILogin,
  });

  // 3. User creates a new story
  const story =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          main_plot: RandomGenerator.content({ paragraphs: 1 }),
          language: "ko",
        } satisfies IStoryfieldAiStory.ICreate,
      },
    );
  typia.assert(story);

  // 4. User uploads an image to the story
  const image =
    await api.functional.storyfieldAi.authenticatedUser.stories.images.create(
      connection,
      {
        storyId: story.id,
        body: {
          storyfield_ai_story_id: story.id,
          image_uri: "https://bucket.s3.amazonaws.com/path/to/test-image.png",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IStoryfieldAiStoryImage.ICreate,
      },
    );
  typia.assert(image);

  // 5. System admin logs back in and deletes the image
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: admin_external_id,
      email: admin_email,
    } satisfies IStoryfieldAiSystemAdmin.ILogin,
  });

  await api.functional.storyfieldAi.systemAdmin.stories.images.erase(
    connection,
    {
      storyId: story.id,
      imageId: image.id,
    },
  );

  // 6. Since there's no direct read for the image, verify business workflow by adding another image
  await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: user_external_id,
      email: user_email,
    } satisfies IStoryfieldAiAuthenticatedUser.ILogin,
  });

  const newImage =
    await api.functional.storyfieldAi.authenticatedUser.stories.images.create(
      connection,
      {
        storyId: story.id,
        body: {
          storyfield_ai_story_id: story.id,
          image_uri: "https://bucket.s3.amazonaws.com/path/to/new-image.png",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IStoryfieldAiStoryImage.ICreate,
      },
    );
  typia.assert(newImage);
  TestValidator.notEquals(
    "Deleted image id and new image id must be different",
    image.id,
    newImage.id,
  );
}
