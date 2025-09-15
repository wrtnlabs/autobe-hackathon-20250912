import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIStoryfieldAiStoryPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiStoryPage";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import type { IStoryfieldAiStoryPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryPage";

/**
 * Validate story page pagination and listing by authenticated user (owner
 * only).
 *
 * - Register and login as authenticated user (user1).
 * - Create a story for user1.
 * - Add 20 pages to the story for pagination.
 * - Perform various PATCH /stories/{storyId}/pages requests:
 *
 *   - Default page/limit (should return first page, default 15 limit; correct
 *       ordering).
 *   - Second page (next page, ensure correct pages and order).
 *   - OrderBy: desc ordering by page_number (reverse order)
 *   - Search by text from a page (partial content match)
 * - Register another authenticated user (user2), login, and attempt to access
 *   user1's story pages (should be denied).
 * - Validate correctness of page content, total count, and permission
 *   enforcement.
 */
export async function test_api_story_pages_list_pagination_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register & login as user1
  const user1_external_id = RandomGenerator.alphaNumeric(12);
  const user1_email = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const user1_join = await api.functional.auth.authenticatedUser.join(
    connection,
    {
      body: {
        external_user_id: user1_external_id,
        email: user1_email,
        actor_type: "authenticatedUser",
      },
    },
  );
  typia.assert(user1_join);

  // 2. Create story as user1
  const story =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      {
        body: {
          title: RandomGenerator.name(4),
          main_plot: RandomGenerator.paragraph({ sentences: 4 }),
          language: "en",
        },
      },
    );
  typia.assert(story);

  // 3. Add 20 pages to this story
  const pages = ArrayUtil.repeat(
    20,
    (i) =>
      ({
        page_number: i + 1,
        text: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 2,
          sentenceMax: 4,
          wordMin: 3,
          wordMax: 7,
        }),
      }) satisfies IStoryfieldAiStoryPage.ICreate,
  );
  const createdPages: IStoryfieldAiStoryPage[] = [];
  for (const page of pages) {
    const res =
      await api.functional.storyfieldAi.authenticatedUser.stories.pages.create(
        connection,
        {
          storyId: story.id,
          body: page,
        },
      );
    typia.assert(res);
    createdPages.push(res);
  }

  // 4. List pages with default pagination (should get first 15)
  const result_default =
    await api.functional.storyfieldAi.authenticatedUser.stories.pages.index(
      connection,
      {
        storyId: story.id,
        body: {},
      },
    );
  typia.assert(result_default);
  TestValidator.equals("first page item count", result_default.data.length, 15);
  TestValidator.equals(
    "correct order of default page_number",
    result_default.data.map((p) => p.page_number),
    pages.slice(0, 15).map((p) => p.page_number),
  );

  // 5. Second page with limit 7
  const result_pg2 =
    await api.functional.storyfieldAi.authenticatedUser.stories.pages.index(
      connection,
      {
        storyId: story.id,
        body: {
          page: 2 satisfies number as number,
          limit: 7 satisfies number as number,
        },
      },
    );
  typia.assert(result_pg2);
  TestValidator.equals(
    "second page item count (limit 7)",
    result_pg2.data.length,
    7,
  );
  TestValidator.equals(
    "correct order of page_numbers on 2nd page (7 items)",
    result_pg2.data.map((p) => p.page_number),
    pages.slice(7, 14).map((p) => p.page_number),
  );

  // 6. Descending order
  const result_desc =
    await api.functional.storyfieldAi.authenticatedUser.stories.pages.index(
      connection,
      {
        storyId: story.id,
        body: { orderBy: "page_number", order: "desc" },
      },
    );
  typia.assert(result_desc);
  TestValidator.equals(
    "descending order of page_number",
    result_desc.data.map((p) => p.page_number),
    [...pages]
      .reverse()
      .slice(0, 15)
      .map((p) => p.page_number),
  );

  // 7. Search filter on text
  // Use known substring from a random page
  const searchPage = createdPages[RandomGenerator.pick([...Array(20).keys()])];
  const keyword = RandomGenerator.substring(searchPage.text);
  const result_search =
    await api.functional.storyfieldAi.authenticatedUser.stories.pages.index(
      connection,
      {
        storyId: story.id,
        body: { search: keyword },
      },
    );
  typia.assert(result_search);
  TestValidator.predicate(
    "at least one result for search",
    result_search.data.length >= 1,
  );
  TestValidator.predicate(
    "every result contains keyword in text",
    result_search.data.every((p) => p.text.includes(keyword)),
  );

  // 8. Register another user and test cross-user auth
  const user2_external_id = RandomGenerator.alphaNumeric(12);
  const user2_email = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  await api.functional.auth.authenticatedUser.join(connection, {
    body: {
      external_user_id: user2_external_id,
      email: user2_email,
      actor_type: "authenticatedUser",
    },
  });
  await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: user2_external_id,
      email: user2_email,
    },
  });
  await TestValidator.error("unauthorized cross-user page access", async () => {
    await api.functional.storyfieldAi.authenticatedUser.stories.pages.index(
      connection,
      {
        storyId: story.id,
        body: {},
      },
    );
  });
}
