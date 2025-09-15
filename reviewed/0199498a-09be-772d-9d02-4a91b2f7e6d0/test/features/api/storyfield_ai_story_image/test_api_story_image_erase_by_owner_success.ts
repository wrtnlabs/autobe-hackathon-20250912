import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import type { IStoryfieldAiStoryImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryImage";

/**
 * Authenticated user can delete (soft delete) their own story image.
 *
 * Steps:
 *
 * 1. Register as a new 'authenticatedUser' with random external_user_id and
 *    email (actor_type fixed)
 * 2. Log in with same credentials to obtain authentication context
 * 3. Create a new story (minimal required data)
 * 4. Add an image to the story (must supply story_id, image_uri, [desc null])
 * 5. Soft delete the image just created
 * 6. Confirm that delete does not throw and API contract completes
 * 7. (Business) Validate by attempting another image creation and soft
 *    deletion flow; check that calling erase on already-deleted image does
 *    not raise error in this scenario (as per contract, repeated erase is
 *    idempotent). No index endpoint for images, so cannot verify via list;
 *    rely on the returned DTOs and the updated deleted_at timestamp on soft
 *    deletion.
 */
export async function test_api_story_image_erase_by_owner_success(
  connection: api.IConnection,
) {
  // 1. Register as authenticated user
  const userExternalId = RandomGenerator.alphaNumeric(16);
  const userEmail = `${RandomGenerator.alphaNumeric(5)}@autobe.com`;
  const registerBody = {
    external_user_id: userExternalId,
    email: userEmail,
    actor_type: "authenticatedUser",
  } satisfies IStoryfieldAiAuthenticatedUser.ICreate;
  const user = await api.functional.auth.authenticatedUser.join(connection, {
    body: registerBody,
  });
  typia.assert(user);

  // 2. Login as that user (gets session JWT in connection)
  const loginBody = {
    external_user_id: userExternalId,
    email: userEmail,
  } satisfies IStoryfieldAiAuthenticatedUser.ILogin;
  const loginOutput = await api.functional.auth.authenticatedUser.login(
    connection,
    {
      body: loginBody,
    },
  );
  typia.assert(loginOutput);

  // 3. Create a new story
  const storyBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    main_plot: RandomGenerator.paragraph({ sentences: 5 }),
    language: RandomGenerator.pick(["ko", "en", "ja", "es", "zh"] as const),
  } satisfies IStoryfieldAiStory.ICreate;
  const story =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      { body: storyBody },
    );
  typia.assert(story);
  TestValidator.equals(
    "story owner is authenticated user",
    story.storyfield_ai_authenticateduser_id,
    user.id,
  );
  TestValidator.equals("story title matches", story.title, storyBody.title);

  // 4. Add an image to the story
  const imageBody = {
    storyfield_ai_story_id: story.id,
    image_uri: `https://storage.autobe-images.com/${RandomGenerator.alphaNumeric(12)}.png`,
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 10,
    }),
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
  TestValidator.equals(
    "image is linked to correct story",
    image.storyfield_ai_story_id,
    story.id,
  );
  TestValidator.equals(
    "image_uri matches input",
    image.image_uri,
    imageBody.image_uri,
  );
  TestValidator.equals(
    "image is not soft-deleted at creation",
    image.deleted_at,
    null,
  );

  // 5. Delete the image (soft delete)
  await api.functional.storyfieldAi.authenticatedUser.stories.images.erase(
    connection,
    {
      storyId: story.id,
      imageId: image.id,
    },
  );
  // No output for delete, so assert that it completes successfully

  // 6. Soft-deletion test: Try second delete, expect idempotency
  await api.functional.storyfieldAi.authenticatedUser.stories.images.erase(
    connection,
    {
      storyId: story.id,
      imageId: image.id,
    },
  );

  // 7. Business Extension: Add another image and erase
  const image2Body = {
    storyfield_ai_story_id: story.id,
    image_uri: `https://storage.autobe-images.com/${RandomGenerator.alphaNumeric(12)}.png`,
    description: null,
  } satisfies IStoryfieldAiStoryImage.ICreate;
  const image2 =
    await api.functional.storyfieldAi.authenticatedUser.stories.images.create(
      connection,
      {
        storyId: story.id,
        body: image2Body,
      },
    );
  typia.assert(image2);
  TestValidator.equals(
    "2nd image is newly created, not deleted",
    image2.deleted_at,
    null,
  );
  await api.functional.storyfieldAi.authenticatedUser.stories.images.erase(
    connection,
    {
      storyId: story.id,
      imageId: image2.id,
    },
  );
}
