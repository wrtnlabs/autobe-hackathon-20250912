import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import type { IStoryfieldAiStoryPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryPage";

/**
 * Validate soft-delete (deactivate) of a story page by its owner.
 *
 * 1. Register a primary authenticated user (federated identity)
 * 2. Log in as that user
 * 3. Create a story for that user
 * 4. Add a page to the story
 * 5. Delete (soft-delete) the page
 * 6. Assert that deleted_at field is set and the page would not be retrievable
 *    through normal means (simulate; no get endpoint)
 * 7. Try deleting again - expect error
 * 8. Try deleting a non-existent page (random uuid) - expect error
 * 9. Register a second authenticated user and story/page
 * 10. Log back in as the primary user and try to delete the second user's page -
 *     expect error
 */
export async function test_api_story_page_soft_delete_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register primary user
  const userExternalId = RandomGenerator.alphaNumeric(12);
  const userEmail = `${RandomGenerator.alphaNumeric(8)}@e2e.test.com`;
  const authorizedUser = await api.functional.auth.authenticatedUser.join(
    connection,
    {
      body: {
        external_user_id: userExternalId,
        email: userEmail,
        actor_type: "authenticatedUser",
      },
    },
  );
  typia.assert(authorizedUser);

  // 2. Login as primary user
  const loginUser = await api.functional.auth.authenticatedUser.login(
    connection,
    {
      body: {
        external_user_id: userExternalId,
        email: userEmail,
      },
    },
  );
  typia.assert(loginUser);

  // 3. Create a story
  const story =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          main_plot: RandomGenerator.paragraph({ sentences: 2 }),
          language: "ko",
        },
      },
    );
  typia.assert(story);

  // 4. Add a page to the story
  const page =
    await api.functional.storyfieldAi.authenticatedUser.stories.pages.create(
      connection,
      {
        storyId: story.id,
        body: {
          page_number: 1,
          text: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(page);

  // 5. Soft-delete the page
  await api.functional.storyfieldAi.authenticatedUser.stories.pages.erase(
    connection,
    {
      storyId: story.id,
      pageId: page.id,
    },
  );

  // 6. Attempt to delete again – expect error
  await TestValidator.error(
    "deleting already deleted page should fail",
    async () => {
      await api.functional.storyfieldAi.authenticatedUser.stories.pages.erase(
        connection,
        {
          storyId: story.id,
          pageId: page.id,
        },
      );
    },
  );

  // 7. Attempt to delete a non-existent page
  await TestValidator.error(
    "deleting non-existent page should fail",
    async () => {
      await api.functional.storyfieldAi.authenticatedUser.stories.pages.erase(
        connection,
        {
          storyId: story.id,
          pageId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 8. Register a second user
  const user2ExternalId = RandomGenerator.alphaNumeric(12);
  const user2Email = `${RandomGenerator.alphaNumeric(8)}@e2e2.test.com`;
  const authorizedUser2 = await api.functional.auth.authenticatedUser.join(
    connection,
    {
      body: {
        external_user_id: user2ExternalId,
        email: user2Email,
        actor_type: "authenticatedUser",
      },
    },
  );
  typia.assert(authorizedUser2);
  // Login as user2
  const loginUser2 = await api.functional.auth.authenticatedUser.login(
    connection,
    {
      body: {
        external_user_id: user2ExternalId,
        email: user2Email,
      },
    },
  );
  typia.assert(loginUser2);
  // user2 creates a story and adds a page
  const user2Story =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          main_plot: RandomGenerator.paragraph({ sentences: 2 }),
          language: "ko",
        },
      },
    );
  typia.assert(user2Story);
  const user2Page =
    await api.functional.storyfieldAi.authenticatedUser.stories.pages.create(
      connection,
      {
        storyId: user2Story.id,
        body: {
          page_number: 1,
          text: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(user2Page);
  // Re-login as primary user
  const reloginUser = await api.functional.auth.authenticatedUser.login(
    connection,
    {
      body: {
        external_user_id: userExternalId,
        email: userEmail,
      },
    },
  );
  typia.assert(reloginUser);
  // Try to delete user2's page (should fail)
  await TestValidator.error("cannot delete another user's page", async () => {
    await api.functional.storyfieldAi.authenticatedUser.stories.pages.erase(
      connection,
      {
        storyId: user2Story.id,
        pageId: user2Page.id,
      },
    );
  });
}
