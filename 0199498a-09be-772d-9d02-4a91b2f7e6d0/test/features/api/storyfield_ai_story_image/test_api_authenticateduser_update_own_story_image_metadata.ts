import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import type { IStoryfieldAiStoryImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryImage";

/**
 * Verify that an authenticated user can update their own story's image
 * metadata.
 *
 * 1. Register and log in as authenticated user.
 * 2. Create a new story and add an image to it.
 * 3. Update image's metadata (image_uri, description) referencing storyId and
 *    imageId.
 * 4. Confirm metadata and audit updates.
 * 5. Attempt unauthorized update as another user (should fail).
 * 6. Attempt to update invalid imageId (should fail).
 */
export async function test_api_authenticateduser_update_own_story_image_metadata(
  connection: api.IConnection,
) {
  // 1. Register as user1
  const user1_external_id = RandomGenerator.alphaNumeric(12);
  const user1_email = `user1+${RandomGenerator.alphaNumeric(8)}@storyfield.com`;
  const user1_register = await api.functional.auth.authenticatedUser.join(
    connection,
    {
      body: {
        external_user_id: user1_external_id,
        email: user1_email,
        actor_type: "authenticatedUser",
      },
    },
  );
  typia.assert(user1_register);

  // 2. Login as user1
  const user1_login = await api.functional.auth.authenticatedUser.login(
    connection,
    {
      body: {
        external_user_id: user1_external_id,
        email: user1_email,
      },
    },
  );
  typia.assert(user1_login);

  // 3. Create a new story
  const storyBody = {
    title: RandomGenerator.name(3),
    main_plot: RandomGenerator.paragraph({ sentences: 5 }),
    language: "ko-KR",
  } satisfies IStoryfieldAiStory.ICreate;
  const story =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      {
        body: storyBody,
      },
    );
  typia.assert(story);

  // 4. Add image to story
  const imageBody = {
    storyfield_ai_story_id: story.id,
    image_uri: `https://img.storyfield.ai/${RandomGenerator.alphaNumeric(16)}.png`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IStoryfieldAiStoryImage.ICreate;
  const image =
    await api.functional.storyfieldAi.authenticatedUser.stories.images.create(
      connection,
      {
        storyId: story.id,
        body: imageBody,
      },
    );
  typia.assert(image);

  // 5. Update image metadata
  const updateBody = {
    image_uri: `https://img.storyfield.ai/${RandomGenerator.alphaNumeric(20)}.png`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IStoryfieldAiStoryImage.IUpdate;
  const updated =
    await api.functional.storyfieldAi.authenticatedUser.stories.images.update(
      connection,
      {
        storyId: story.id,
        imageId: image.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "image_uri updated",
    updated.image_uri,
    updateBody.image_uri,
  );
  TestValidator.equals(
    "description updated",
    updated.description,
    updateBody.description,
  );
  TestValidator.predicate(
    "updated_at should be newer than created_at",
    new Date(updated.updated_at) > new Date(updated.created_at),
  );

  // 6. Register as a second user
  const user2_external_id = RandomGenerator.alphaNumeric(12);
  const user2_email = `user2+${RandomGenerator.alphaNumeric(8)}@storyfield.com`;
  const user2_register = await api.functional.auth.authenticatedUser.join(
    connection,
    {
      body: {
        external_user_id: user2_external_id,
        email: user2_email,
        actor_type: "authenticatedUser",
      },
    },
  );
  typia.assert(user2_register);

  // 7. Login as user2 and attempt to update image (should fail)
  const user2_login = await api.functional.auth.authenticatedUser.login(
    connection,
    {
      body: {
        external_user_id: user2_external_id,
        email: user2_email,
      },
    },
  );
  typia.assert(user2_login);

  await TestValidator.error("different user cannot update image", async () => {
    await api.functional.storyfieldAi.authenticatedUser.stories.images.update(
      connection,
      {
        storyId: story.id,
        imageId: image.id,
        body: {
          description: "ShouldNotWork",
        },
      },
    );
  });

  // 8. Restore login as original user1
  await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: user1_external_id,
      email: user1_email,
    },
  });

  // 9. Attempt update with non-existent imageId
  await TestValidator.error(
    "update with non-existent imageId should fail",
    async () => {
      await api.functional.storyfieldAi.authenticatedUser.stories.images.update(
        connection,
        {
          storyId: story.id,
          imageId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            image_uri: `https://img.storyfield.ai/${RandomGenerator.alphaNumeric(16)}.png`,
          },
        },
      );
    },
  );
}
