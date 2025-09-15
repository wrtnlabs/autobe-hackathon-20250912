import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import type { IStoryfieldAiStoryPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryPage";

/**
 * Validate authenticated user page detail access and audit, including negative
 * access control.
 *
 * 1. Register and login as a user (userA)
 * 2. Create a new story
 * 3. Create a page in the story
 * 4. Retrieve and validate details via GET for that page
 * 5. Attempt access with invalid pageId (random UUID)
 * 6. Register another user (userB), login, create their own story/page
 * 7. Switch back to userA, try to get userB's page by storyId/pageId: should fail
 */
export async function test_api_story_page_detail_access_control_and_audit(
  connection: api.IConnection,
) {
  // 1. Register userA
  const userAJoinInput: IStoryfieldAiAuthenticatedUser.ICreate = {
    external_user_id: RandomGenerator.alphaNumeric(16),
    email: `${RandomGenerator.alphaNumeric(8)}@autotest.com`,
    actor_type: "authenticatedUser",
  };
  const userA: IStoryfieldAiAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.join(connection, {
      body: userAJoinInput,
    });
  typia.assert(userA);

  // 2. Login userA to refresh token and headers (SDK sets header)
  const loginA = await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: userA.external_user_id,
      email: userA.email,
    },
  });
  typia.assert(loginA);

  // 3. Create a story as userA
  const storyInput: IStoryfieldAiStory.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    main_plot: RandomGenerator.paragraph({ sentences: 5 }),
    language: "ko-KR",
  };
  const story: IStoryfieldAiStory =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      { body: storyInput },
    );
  typia.assert(story);
  TestValidator.equals(
    "created story is for userA",
    story.storyfield_ai_authenticateduser_id,
    userA.id,
  );
  TestValidator.equals("story title matches", story.title, storyInput.title);

  // 4. Create a story page in userA's story
  const pageInput: IStoryfieldAiStoryPage.ICreate = {
    page_number: 1,
    text: RandomGenerator.content({ paragraphs: 2 }),
  };
  const page: IStoryfieldAiStoryPage =
    await api.functional.storyfieldAi.authenticatedUser.stories.pages.create(
      connection,
      {
        storyId: story.id,
        body: pageInput,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "page created is for story",
    page.storyfield_ai_story_id,
    story.id,
  );
  TestValidator.equals("page_number", page.page_number, pageInput.page_number);
  TestValidator.equals("page text", page.text, pageInput.text);

  // 5. Retrieve the created page (should succeed)
  const got: IStoryfieldAiStoryPage =
    await api.functional.storyfieldAi.authenticatedUser.stories.pages.at(
      connection,
      {
        storyId: story.id,
        pageId: page.id,
      },
    );
  typia.assert(got);
  TestValidator.equals("retrieved page matches created page", got, page);

  // 6. Negative: Try to get a page with invalid pageId (random UUID in same story)
  await TestValidator.error("get on non-existent pageId fails", async () => {
    await api.functional.storyfieldAi.authenticatedUser.stories.pages.at(
      connection,
      {
        storyId: story.id,
        pageId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // 7. Register userB (with different external_user_id/email)
  const userBJoinInput: IStoryfieldAiAuthenticatedUser.ICreate = {
    external_user_id: RandomGenerator.alphaNumeric(16),
    email: `${RandomGenerator.alphaNumeric(8)}@autotest.com`,
    actor_type: "authenticatedUser",
  };
  const userB: IStoryfieldAiAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.join(connection, {
      body: userBJoinInput,
    });
  typia.assert(userB);

  // login as userB
  const loginB = await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: userB.external_user_id,
      email: userB.email,
    },
  });
  typia.assert(loginB);

  // Create story and page for userB
  const storyBInput: IStoryfieldAiStory.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    main_plot: RandomGenerator.paragraph({ sentences: 5 }),
    language: "en-US",
  };
  const storyB: IStoryfieldAiStory =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      { body: storyBInput },
    );
  typia.assert(storyB);

  const pageBInput: IStoryfieldAiStoryPage.ICreate = {
    page_number: 1,
    text: RandomGenerator.content({ paragraphs: 1 }),
  };
  const pageB: IStoryfieldAiStoryPage =
    await api.functional.storyfieldAi.authenticatedUser.stories.pages.create(
      connection,
      {
        storyId: storyB.id,
        body: pageBInput,
      },
    );
  typia.assert(pageB);

  // 8. Switch back to userA for negative access control (login again)
  const reloginA = await api.functional.auth.authenticatedUser.login(
    connection,
    {
      body: {
        external_user_id: userA.external_user_id,
        email: userA.email,
      },
    },
  );
  typia.assert(reloginA);

  // 9. Try to fetch page from userB's story as userA (must be access denied)
  await TestValidator.error("userA cannot access userB's page", async () => {
    await api.functional.storyfieldAi.authenticatedUser.stories.pages.at(
      connection,
      {
        storyId: storyB.id,
        pageId: pageB.id,
      },
    );
  });
}
