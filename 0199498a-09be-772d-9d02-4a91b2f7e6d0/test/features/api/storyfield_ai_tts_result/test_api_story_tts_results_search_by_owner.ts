import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIStoryfieldAiTtsResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiTtsResult";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import type { IStoryfieldAiStoryPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryPage";
import type { IStoryfieldAiTtsResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiTtsResult";

/**
 * Validate searching TTS results for a story by the authenticated owner, with
 * filtering and pagination.
 *
 * 1. Register and authenticate as a user
 * 2. Create a story
 * 3. Add a page to the story
 * 4. Generate a TTS result for the full story (dialect: "standard")
 * 5. Generate a TTS result for the story page (dialect: "gyeongsang")
 * 6. Search for all TTS results on that story (no filters) – expect both
 * 7. Search filtered by dialect "standard" – expect only that result
 * 8. Search filtered by dialect "gyeongsang" – expect only the page result
 * 9. Search filtered by story page ID – expect only per-page TTS
 * 10. Test pagination (limit=1) – expect paginated/partial result
 * 11. Validate correct inclusion and exclusion of target records
 */
export async function test_api_story_tts_results_search_by_owner(
  connection: api.IConnection,
) {
  // 1. Register user
  const externalUserId = RandomGenerator.alphaNumeric(16);
  const email = `${RandomGenerator.name(1)}@domain.com`;
  const joinUser = await api.functional.auth.authenticatedUser.join(
    connection,
    {
      body: {
        external_user_id: externalUserId,
        email,
        actor_type: "authenticatedUser",
      },
    },
  );
  typia.assert(joinUser);

  // 2. Login
  const loginUser = await api.functional.auth.authenticatedUser.login(
    connection,
    {
      body: {
        external_user_id: externalUserId,
        email,
      },
    },
  );
  typia.assert(loginUser);

  // 3. Create story
  const story =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      {
        body: {
          title: RandomGenerator.name(3),
          main_plot: RandomGenerator.paragraph({ sentences: 5 }),
          language: RandomGenerator.pick(["ko", "en", "gyeongsang"] as const),
        },
      },
    );
  typia.assert(story);

  // 4. Create story page
  const page =
    await api.functional.storyfieldAi.authenticatedUser.stories.pages.create(
      connection,
      {
        storyId: story.id,
        body: {
          page_number: 1,
          text: RandomGenerator.paragraph({ sentences: 4 }),
        },
      },
    );
  typia.assert(page);

  // 5. Generate TTS for full story (dialect: "standard")
  const storyTts =
    await api.functional.storyfieldAi.authenticatedUser.stories.ttsResults.create(
      connection,
      {
        storyId: story.id,
        body: {
          tts_audio_uri: `https://audio.example.com/${RandomGenerator.alphaNumeric(24)}.mp3`,
          source_text: RandomGenerator.content({ paragraphs: 2 }),
          dialect: "standard",
        },
      },
    );
  typia.assert(storyTts);

  // 6. Generate TTS for story page (dialect: "gyeongsang")
  const pageTts =
    await api.functional.storyfieldAi.authenticatedUser.stories.ttsResults.create(
      connection,
      {
        storyId: story.id,
        body: {
          tts_audio_uri: `https://audio.example.com/${RandomGenerator.alphaNumeric(24)}.mp3`,
          source_text: page.text,
          dialect: "gyeongsang",
          storyfield_ai_story_page_id: page.id,
        },
      },
    );
  typia.assert(pageTts);

  // 7. Search all TTS results (no filters)
  const allResults =
    await api.functional.storyfieldAi.authenticatedUser.stories.ttsResults.index(
      connection,
      {
        storyId: story.id,
        body: {},
      },
    );
  typia.assert(allResults);
  const resultIds = allResults.data.map((x) => x.id);
  TestValidator.predicate(
    "all created TTS results should be present (unfiltered)",
    resultIds.includes(storyTts.id) && resultIds.includes(pageTts.id),
  );

  // 8. Search/filter by dialect ("standard")
  const standardResults =
    await api.functional.storyfieldAi.authenticatedUser.stories.ttsResults.index(
      connection,
      {
        storyId: story.id,
        body: { dialect: "standard" },
      },
    );
  typia.assert(standardResults);
  TestValidator.predicate(
    "only standard dialect result present",
    standardResults.data.length === 1 &&
      standardResults.data[0].id === storyTts.id,
  );

  // 9. Search/filter by dialect ("gyeongsang")
  const gyeongsangResults =
    await api.functional.storyfieldAi.authenticatedUser.stories.ttsResults.index(
      connection,
      {
        storyId: story.id,
        body: { dialect: "gyeongsang" },
      },
    );
  typia.assert(gyeongsangResults);
  TestValidator.predicate(
    "only gyeongsang dialect result present",
    gyeongsangResults.data.length === 1 &&
      gyeongsangResults.data[0].id === pageTts.id,
  );

  // 10. Search/filter by page id
  const pageResults =
    await api.functional.storyfieldAi.authenticatedUser.stories.ttsResults.index(
      connection,
      {
        storyId: story.id,
        body: { storyfield_ai_story_page_id: page.id },
      },
    );
  typia.assert(pageResults);
  TestValidator.predicate(
    "only per-page TTS result present via page id filter",
    pageResults.data.length === 1 && pageResults.data[0].id === pageTts.id,
  );

  // 11. Pagination test (limit=1)
  const pagedResults =
    await api.functional.storyfieldAi.authenticatedUser.stories.ttsResults.index(
      connection,
      {
        storyId: story.id,
        body: { limit: 1 },
      },
    );
  typia.assert(pagedResults);
  TestValidator.equals(
    "pagination with limit 1 returns exactly 1 record",
    pagedResults.data.length,
    1,
  );
}
