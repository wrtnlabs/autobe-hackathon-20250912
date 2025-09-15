import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import type { IStoryfieldAiStoryImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryImage";

/**
 * Verify that an authenticated user can upload an image to a story they own,
 * with proper business error handling for unauthorized operations.
 *
 * Steps:
 *
 * 1. Register a user and log in (store external_user_id, email).
 * 2. Create a story for the user.
 * 3. Add an image to their own story, validate image metadata
 *    (storyfield_ai_story_id matches, image_uri/description correct).
 * 4. Create a second user and story. Attempt to add an image to that story while
 *    logged in as the first user (should error).
 */
export async function test_api_authenticateduser_add_image_to_own_story(
  connection: api.IConnection,
) {
  // Register User 1
  const extUserId1 = RandomGenerator.alphaNumeric(16);
  const email1 = `${RandomGenerator.alphabets(8)}@company.com`;
  const reg1 = await api.functional.auth.authenticatedUser.join(connection, {
    body: {
      external_user_id: extUserId1,
      email: email1,
      actor_type: "authenticatedUser",
    } satisfies IStoryfieldAiAuthenticatedUser.ICreate,
  });
  typia.assert(reg1);

  // Log in as User 1
  const login1 = await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: extUserId1,
      email: email1,
    } satisfies IStoryfieldAiAuthenticatedUser.ILogin,
  });
  typia.assert(login1);

  // Create a story for User 1
  const story1 =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          main_plot: RandomGenerator.paragraph({ sentences: 5 }),
          language: "ko-KR",
        } satisfies IStoryfieldAiStory.ICreate,
      },
    );
  typia.assert(story1);

  // Add image to own story
  const imageData = {
    storyfield_ai_story_id: story1.id,
    image_uri: `https://storage.example.com/${RandomGenerator.alphaNumeric(32)}.jpg`,
    description: RandomGenerator.paragraph(),
  } satisfies IStoryfieldAiStoryImage.ICreate;
  const image =
    await api.functional.storyfieldAi.authenticatedUser.stories.images.create(
      connection,
      {
        storyId: story1.id,
        body: imageData,
      },
    );
  typia.assert(image);
  TestValidator.equals(
    "image metadata correct",
    image.storyfield_ai_story_id,
    story1.id,
  );
  TestValidator.equals(
    "image_uri matches",
    image.image_uri,
    imageData.image_uri,
  );
  TestValidator.equals(
    "description matches",
    image.description,
    imageData.description,
  );

  // Register User 2
  const extUserId2 = RandomGenerator.alphaNumeric(16);
  const email2 = `${RandomGenerator.alphabets(8)}@company.com`;
  const reg2 = await api.functional.auth.authenticatedUser.join(connection, {
    body: {
      external_user_id: extUserId2,
      email: email2,
      actor_type: "authenticatedUser",
    } satisfies IStoryfieldAiAuthenticatedUser.ICreate,
  });
  typia.assert(reg2);

  // Log in as User 2 and create a story
  const login2 = await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: extUserId2,
      email: email2,
    } satisfies IStoryfieldAiAuthenticatedUser.ILogin,
  });
  typia.assert(login2);
  const story2 =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          main_plot: RandomGenerator.paragraph({ sentences: 6 }),
          language: "en-US",
        } satisfies IStoryfieldAiStory.ICreate,
      },
    );
  typia.assert(story2);

  // Log back as User 1
  await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: extUserId1,
      email: email1,
    } satisfies IStoryfieldAiAuthenticatedUser.ILogin,
  });

  // Attempt unauthorized image upload (User 1 -> User 2's story)
  await TestValidator.error(
    "cannot add image to another user's story",
    async () => {
      await api.functional.storyfieldAi.authenticatedUser.stories.images.create(
        connection,
        {
          storyId: story2.id,
          body: {
            storyfield_ai_story_id: story2.id,
            image_uri: `https://storage.example.com/${RandomGenerator.alphaNumeric(12)}.png`,
          } satisfies IStoryfieldAiStoryImage.ICreate,
        },
      );
    },
  );
}
