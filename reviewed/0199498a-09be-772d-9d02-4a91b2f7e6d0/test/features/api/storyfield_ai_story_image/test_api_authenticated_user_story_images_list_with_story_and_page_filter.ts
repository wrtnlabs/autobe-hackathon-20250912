import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIStoryfieldAiStoryImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiStoryImage";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import type { IStoryfieldAiStoryImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryImage";
import type { IStoryfieldAiStoryPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryPage";

/**
 * This test verifies the paginated and filtered image listing for an
 * authenticated user's story. Steps:
 *
 * 1. Register and login as a new authenticated user
 * 2. Create a story
 * 3. Create a page for the story
 * 4. Upload two images: one story-wide, one page-specific
 * 5. List all images and verify both are present
 * 6. List images filtered by page and verify only the page image is present
 * 7. Attempt to list images for invalid story or page (error or empty as
 *    appropriate)
 * 8. Attempt to get image list for a different user's story (should fail)
 * 9. Test pagination logic with limit=1
 * 10. Soft-delete exclusion cannot be tested (API lacks delete), so is skipped
 */
export async function test_api_authenticated_user_story_images_list_with_story_and_page_filter(
  connection: api.IConnection,
) {
  // 1. Register and login
  const userExternalId = RandomGenerator.alphaNumeric(8);
  const userEmail = `${RandomGenerator.name(1)}_${RandomGenerator.alphaNumeric(5)}@domain.com`;
  const join = await api.functional.auth.authenticatedUser.join(connection, {
    body: {
      external_user_id: userExternalId,
      email: userEmail,
      actor_type: "authenticatedUser",
    },
  });
  typia.assert(join);

  const login = await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: userExternalId,
      email: userEmail,
    },
  });
  typia.assert(login);

  // 2. Create a story
  const story =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          main_plot: RandomGenerator.paragraph({ sentences: 4 }),
          language: RandomGenerator.pick(["ko", "en"] as const),
        },
      },
    );
  typia.assert(story);

  // 3. Create a page in the story
  const page =
    await api.functional.storyfieldAi.authenticatedUser.stories.pages.create(
      connection,
      {
        storyId: story.id,
        body: {
          page_number: 1,
          text: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(page);

  // 4. Add two images: story-wide and page-specific
  const imgA =
    await api.functional.storyfieldAi.authenticatedUser.stories.images.create(
      connection,
      {
        storyId: story.id,
        body: {
          storyfield_ai_story_id: story.id,
          image_uri: `https://image.cdn/${RandomGenerator.alphaNumeric(10)}.jpg`,
          description: "Story-wide illustration",
        },
      },
    );
  typia.assert(imgA);

  const imgB =
    await api.functional.storyfieldAi.authenticatedUser.stories.images.create(
      connection,
      {
        storyId: story.id,
        body: {
          storyfield_ai_story_id: story.id,
          storyfield_ai_story_page_id: page.id,
          image_uri: `https://image.cdn/${RandomGenerator.alphaNumeric(10)}.jpg`,
          description: "Page-specific illustration",
        },
      },
    );
  typia.assert(imgB);

  // 5. Unfiltered image list (should contain both images)
  const pageUnfiltered =
    await api.functional.storyfieldAi.authenticatedUser.stories.images.index(
      connection,
      {
        storyId: story.id,
        body: {},
      },
    );
  typia.assert(pageUnfiltered);
  TestValidator.predicate(
    "image A is included in full image list",
    pageUnfiltered.data.some((img) => img.id === imgA.id),
  );
  TestValidator.predicate(
    "image B is included in full image list",
    pageUnfiltered.data.some((img) => img.id === imgB.id),
  );

  // 6. Image list filtered by page (only imgB expected)
  const paged =
    await api.functional.storyfieldAi.authenticatedUser.stories.images.index(
      connection,
      {
        storyId: story.id,
        body: {
          storyfield_ai_story_page_id: page.id,
        },
      },
    );
  typia.assert(paged);
  TestValidator.predicate(
    "only page-specific image is in page filter list",
    paged.data.length === 1 && paged.data[0].id === imgB.id,
  );

  // 7. Invalid storyId returns error
  await TestValidator.error(
    "listing images with invalid story id fails",
    async () => {
      await api.functional.storyfieldAi.authenticatedUser.stories.images.index(
        connection,
        {
          storyId: typia.random<string & tags.Format<"uuid">>(),
          body: {},
        },
      );
    },
  );

  // 8. Invalid page id returns empty results
  const invalidPage =
    await api.functional.storyfieldAi.authenticatedUser.stories.images.index(
      connection,
      {
        storyId: story.id,
        body: {
          storyfield_ai_story_page_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      },
    );
  typia.assert(invalidPage);
  TestValidator.equals(
    "filtering by random page id yields no results",
    invalidPage.data.length,
    0,
  );

  // 9. Switch to a new user and verify cannot see first user's story images
  const user2_extid = RandomGenerator.alphaNumeric(8);
  const user2_email = `${RandomGenerator.name(1)}_${RandomGenerator.alphaNumeric(5)}@domain.com`;
  await api.functional.auth.authenticatedUser.join(connection, {
    body: {
      external_user_id: user2_extid,
      email: user2_email,
      actor_type: "authenticatedUser",
    },
  });
  await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: user2_extid,
      email: user2_email,
    },
  });
  await TestValidator.error(
    "2nd user cannot access another user's story images",
    async () => {
      await api.functional.storyfieldAi.authenticatedUser.stories.images.index(
        connection,
        {
          storyId: story.id,
          body: {},
        },
      );
    },
  );

  // 10. Test pagination with limit=1
  await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: userExternalId,
      email: userEmail,
    },
  });
  const paginated =
    await api.functional.storyfieldAi.authenticatedUser.stories.images.index(
      connection,
      {
        storyId: story.id,
        body: {
          limit: 1,
        },
      },
    );
  typia.assert(paginated);
  TestValidator.equals(
    "pagination with limit returns single image",
    paginated.data.length,
    1,
  );
  TestValidator.equals(
    "pagination meta limit equals requested limit",
    paginated.pagination.limit,
    1,
  );
  TestValidator.equals(
    "pagination meta 'current' is 0 (first page)",
    paginated.pagination.current,
    0,
  );
  // Cannot test soft delete exclusion (API lacks delete)
}
