import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import type { IStoryfieldAiStoryImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryImage";

/**
 * Validates authenticated user's ability to get their own story image details,
 * cross-ownership denial, and error handling.
 *
 * 1. Register and login as user A.
 * 2. Create a story as user A.
 * 3. Add a story image as user A.
 * 4. Retrieve the detail for the created image by user A (should succeed).
 * 5. Register and login as user B (other user).
 * 6. Attempt to retrieve the image via user B's credentials (should fail).
 * 7. Attempt to retrieve a non-existent imageId (should fail).
 * 8. [Optional] Simulate soft-delete scenario and confirm access is denied to user
 *    A (if API returns error).
 */
export async function test_api_authenticated_user_view_story_image_detail_self_access_and_ownership(
  connection: api.IConnection,
) {
  // Step 1: Register user A
  const userAExternalId = RandomGenerator.alphaNumeric(16);
  const userAEmail = `${RandomGenerator.name(1)}@storyfield.com`;
  const userACreate = {
    external_user_id: userAExternalId,
    email: userAEmail,
    actor_type: "authenticatedUser",
  } satisfies IStoryfieldAiAuthenticatedUser.ICreate;
  const userAAuthorized = await api.functional.auth.authenticatedUser.join(
    connection,
    { body: userACreate },
  );
  typia.assert(userAAuthorized);

  // Step 2: Login as user A (session update)
  const userALogin = {
    external_user_id: userAExternalId,
    email: userAEmail,
  } satisfies IStoryfieldAiAuthenticatedUser.ILogin;
  const userALoginAuthorized =
    await api.functional.auth.authenticatedUser.login(connection, {
      body: userALogin,
    });
  typia.assert(userALoginAuthorized);

  // Step 3: User A creates a story
  const storyCreate = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    main_plot: RandomGenerator.content({ paragraphs: 1 }),
    language: "ko-KR",
  } satisfies IStoryfieldAiStory.ICreate;
  const story =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      { body: storyCreate },
    );
  typia.assert(story);

  // Step 4: User A adds an image to the story
  const imageUri = `https://cdn.storyfield.ai/${RandomGenerator.alphaNumeric(16)}.png`;
  const imageCreate = {
    storyfield_ai_story_id: story.id,
    image_uri: imageUri,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IStoryfieldAiStoryImage.ICreate;
  const createdImage =
    await api.functional.storyfieldAi.authenticatedUser.stories.images.create(
      connection,
      {
        storyId: story.id,
        body: imageCreate,
      },
    );
  typia.assert(createdImage);

  // Step 5: Retrieve the image detail as user A
  const imageDetail =
    await api.functional.storyfieldAi.authenticatedUser.stories.images.at(
      connection,
      {
        storyId: story.id,
        imageId: createdImage.id,
      },
    );
  typia.assert(imageDetail);
  TestValidator.equals(
    "story id matches",
    imageDetail.storyfield_ai_story_id,
    story.id,
  );
  TestValidator.equals("image id matches", imageDetail.id, createdImage.id);
  TestValidator.equals("image uri matches", imageDetail.image_uri, imageUri);
  TestValidator.equals(
    "description matches",
    imageDetail.description,
    imageCreate.description,
  );
  TestValidator.predicate(
    "created_at set",
    typeof imageDetail.created_at === "string" &&
      imageDetail.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at set",
    typeof imageDetail.updated_at === "string" &&
      imageDetail.updated_at.length > 0,
  );
  TestValidator.equals("not deleted", imageDetail.deleted_at, null);

  // Step 6: Register and login as user B (other user)
  const userBExternalId = RandomGenerator.alphaNumeric(16);
  const userBEmail = `${RandomGenerator.name(1)}@storyfield.com`;
  const userBCreate = {
    external_user_id: userBExternalId,
    email: userBEmail,
    actor_type: "authenticatedUser",
  } satisfies IStoryfieldAiAuthenticatedUser.ICreate;
  await api.functional.auth.authenticatedUser.join(connection, {
    body: userBCreate,
  });

  const userBLogin = {
    external_user_id: userBExternalId,
    email: userBEmail,
  } satisfies IStoryfieldAiAuthenticatedUser.ILogin;
  await api.functional.auth.authenticatedUser.login(connection, {
    body: userBLogin,
  });

  // Step 7: Attempt to fetch the image as user B (should fail)
  await TestValidator.error(
    "cross-user cannot fetch other user's story image detail",
    async () => {
      await api.functional.storyfieldAi.authenticatedUser.stories.images.at(
        connection,
        {
          storyId: story.id,
          imageId: createdImage.id,
        },
      );
    },
  );

  // Step 8: Attempt to fetch an invalid/non-existent imageId (should fail)
  await TestValidator.error(
    "non-existent imageId cannot be fetched",
    async () => {
      await api.functional.storyfieldAi.authenticatedUser.stories.images.at(
        connection,
        {
          storyId: story.id,
          imageId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // [Optional] Additional: TODO if API allows, try to simulate soft-deletion and fetch to confirm denial, else skip.
}
