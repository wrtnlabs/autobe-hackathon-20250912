import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import type { IStoryfieldAiStoryPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryPage";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";
import type { IStoryfieldAiTtsResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiTtsResult";

/**
 * Validates TTS generation (as a system admin) for a story page.
 *
 * - Register & login as system admin
 * - Create a test story
 * - Add a page with text to the story
 * - Generate a TTS result for the story page (admin operation)
 * - Confirm TTS result references story/page and has correct data
 */
export async function test_api_tts_generation_for_story_page_as_system_admin(
  connection: api.IConnection,
) {
  // Step 1: Register and login as new system admin
  const adminEmail =
    RandomGenerator.name(2).replace(/ /g, "_") + "@acme-admin.com";
  const externalAdminId = RandomGenerator.alphaNumeric(16);
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      external_admin_id: externalAdminId,
      email: adminEmail,
      actor_type: "systemAdmin",
    } satisfies IStoryfieldAiSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // Already authenticated as system admin due to SDK automatic behavior

  // Step 2: As system admin, create a new story
  const storyTitle = RandomGenerator.paragraph({ sentences: 3 });
  const storyLanguage = RandomGenerator.pick([
    "ko",
    "en",
    "gyeongsang",
  ] as const);
  const mainPlot = RandomGenerator.paragraph({ sentences: 8 });
  const story =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      {
        body: {
          title: storyTitle,
          main_plot: mainPlot,
          language: storyLanguage,
        } satisfies IStoryfieldAiStory.ICreate,
      },
    );
  typia.assert(story);

  // Step 3: Add a new page with text to the created story
  const pageText = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 8,
  });
  const pageNumber = 1;
  const storyPage =
    await api.functional.storyfieldAi.authenticatedUser.stories.pages.create(
      connection,
      {
        storyId: story.id,
        body: {
          page_number: pageNumber,
          text: pageText,
        } satisfies IStoryfieldAiStoryPage.ICreate,
      },
    );
  typia.assert(storyPage);

  // Step 4: As admin, generate TTS result for this page
  const ttsAudioUri = `https://audio.cdn/test-tts/${RandomGenerator.alphaNumeric(10)}.mp3`;
  const dialect = RandomGenerator.pick([
    "standard",
    "gyeongsang",
    "jeolla",
  ] as const);

  const ttsResult =
    await api.functional.storyfieldAi.systemAdmin.stories.ttsResults.create(
      connection,
      {
        storyId: story.id,
        body: {
          tts_audio_uri: ttsAudioUri,
          source_text: storyPage.text,
          dialect,
          storyfield_ai_story_page_id: storyPage.id,
        } satisfies IStoryfieldAiTtsResult.ICreate,
      },
    );
  typia.assert(ttsResult);

  // Step 5: Validation of result
  TestValidator.equals(
    "TTS audio_uri correct",
    ttsResult.tts_audio_uri,
    ttsAudioUri,
  );
  TestValidator.equals(
    "source_text matches page text",
    ttsResult.source_text,
    storyPage.text,
  );
  TestValidator.equals("dialect correct", ttsResult.dialect, dialect);
  TestValidator.equals(
    "story reference correct",
    ttsResult.storyfield_ai_story_id,
    story.id,
  );
  TestValidator.equals(
    "page reference correct",
    ttsResult.storyfield_ai_story_page_id,
    storyPage.id,
  );
  TestValidator.predicate(
    "audio URI is http(s)",
    ttsResult.tts_audio_uri.startsWith("http"),
  );
}
