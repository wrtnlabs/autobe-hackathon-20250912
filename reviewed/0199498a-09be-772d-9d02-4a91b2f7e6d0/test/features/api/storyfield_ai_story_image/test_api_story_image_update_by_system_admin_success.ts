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
 * System admin successfully updates the metadata of a specific image (S3 URI or
 * description) attached to a story.
 *
 * 1. Register and login as system admin.
 * 2. Register and login as authenticated user.
 * 3. As authenticated user, create a new story.
 * 4. Attach an image to the story as user.
 * 5. Switch login to admin (system admin).
 * 6. Update image metadata as system admin.
 * 7. Validate the updated values (image_uri, description, story id).
 */
export async function test_api_story_image_update_by_system_admin_success(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const adminExternalId = RandomGenerator.alphaNumeric(16);
  const adminEmail = `${RandomGenerator.alphabets(8)}@admin.com`;
  await api.functional.auth.systemAdmin.join(connection, {
    body: {
      external_admin_id: adminExternalId,
      email: adminEmail,
      actor_type: "systemAdmin",
    },
  });
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: adminExternalId,
      email: adminEmail,
    },
  });

  // 2. Register and login as authenticated user
  const userExternalId = RandomGenerator.alphaNumeric(16);
  const userEmail = `${RandomGenerator.alphabets(10)}@user.com`;
  await api.functional.auth.authenticatedUser.join(connection, {
    body: {
      external_user_id: userExternalId,
      email: userEmail,
      actor_type: "authenticatedUser",
    },
  });
  await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: userExternalId,
      email: userEmail,
    },
  });

  // 3. Create a story as user
  const story =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          main_plot: RandomGenerator.paragraph({ sentences: 6 }),
          language: "en",
        },
      },
    );
  typia.assert(story);

  // 4. Attach an image to the story as user
  const image =
    await api.functional.storyfieldAi.authenticatedUser.stories.images.create(
      connection,
      {
        storyId: story.id,
        body: {
          storyfield_ai_story_id: story.id,
          image_uri: `https://s3.amazonaws.com/test-storyfield/${RandomGenerator.alphaNumeric(16)}.png`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(image);

  // 5. Switch login to admin (system admin)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: adminExternalId,
      email: adminEmail,
    },
  });

  // 6. Update image metadata as system admin
  const updatedUri = `https://s3.amazonaws.com/test-storyfield/${RandomGenerator.alphaNumeric(20)}.png`;
  const updatedDesc = RandomGenerator.paragraph({ sentences: 3 });
  const updatedImage =
    await api.functional.storyfieldAi.systemAdmin.stories.images.update(
      connection,
      {
        storyId: story.id,
        imageId: image.id,
        body: {
          image_uri: updatedUri,
          description: updatedDesc,
        },
      },
    );
  typia.assert(updatedImage);

  // 7. Validate the updated values
  TestValidator.equals(
    "updated image_uri matches the new value",
    updatedImage.image_uri,
    updatedUri,
  );
  TestValidator.equals(
    "updated description matches the new value",
    updatedImage.description,
    updatedDesc,
  );
  TestValidator.equals(
    "story ID remains consistent after image update",
    updatedImage.storyfield_ai_story_id,
    story.id,
  );
}
