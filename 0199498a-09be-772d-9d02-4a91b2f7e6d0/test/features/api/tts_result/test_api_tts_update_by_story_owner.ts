import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import type { IStoryfieldAiStoryPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryPage";
import type { IStoryfieldAiTtsResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiTtsResult";

/**
 * Validate owner update permission and data mutation of TTS result.
 *
 * 1. Register and login as a new user (generate unique external_user_id & email).
 * 2. Create a story; add a page to this story.
 * 3. Generate initial TTS result for that page.
 * 4. Update TTS result (as owner) with new dialect, tts_audio_uri, and
 *    source_text.
 * 5. Check audit fields: updated_at advances, created_at remains, id stable.
 * 6. Attempt forbidden update (simulate by changing the token to a different user
 *    and try update) → expect error.
 * 7. (Omitted: Soft/delete scenario) -- no API for TTS deletion in current SDK.
 * 8. (Omitted: Type errors in input bodies, e.g., missing/invalid fields).
 * 9. Test invalid business field update (e.g., empty source_text); should error.
 */
export async function test_api_tts_update_by_story_owner(
  connection: api.IConnection,
) {
  // 1. Register and login as a new authenticated user
  const extUserId = RandomGenerator.alphaNumeric(12);
  const email = `${RandomGenerator.alphabets(8)}@e2e-owner.com`;
  const join = await api.functional.auth.authenticatedUser.join(connection, {
    body: {
      external_user_id: extUserId,
      email,
      actor_type: "authenticatedUser",
    } satisfies IStoryfieldAiAuthenticatedUser.ICreate,
  });
  typia.assert(join);

  // 2. Explicit login to get/re-assert session
  const login = await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: extUserId,
      email,
    } satisfies IStoryfieldAiAuthenticatedUser.ILogin,
  });
  typia.assert(login);

  // 3. Create story
  const createStory =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          main_plot: RandomGenerator.paragraph({ sentences: 12 }),
          language: RandomGenerator.pick(["ko", "en", "gyeongsang"] as const),
        } satisfies IStoryfieldAiStory.ICreate,
      },
    );
  typia.assert(createStory);

  // 4. Add page
  const page =
    await api.functional.storyfieldAi.authenticatedUser.stories.pages.create(
      connection,
      {
        storyId: createStory.id,
        body: {
          page_number: 1,
          text: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 6,
            sentenceMax: 8,
          }),
        } satisfies IStoryfieldAiStoryPage.ICreate,
      },
    );
  typia.assert(page);

  // 5. Generate initial TTS result
  const ttsResult =
    await api.functional.storyfieldAi.authenticatedUser.stories.ttsResults.create(
      connection,
      {
        storyId: createStory.id,
        body: {
          tts_audio_uri: `https://mock-s3.e2e/${RandomGenerator.alphaNumeric(24)}.mp3`,
          source_text: page.text,
          dialect: "ko",
          storyfield_ai_story_page_id: page.id,
        } satisfies IStoryfieldAiTtsResult.ICreate,
      },
    );
  typia.assert(ttsResult);
  TestValidator.equals(
    "ttsResult is attached to correct story page",
    ttsResult.storyfield_ai_story_page_id,
    page.id,
  );
  TestValidator.equals(
    "ttsResult ownership",
    ttsResult.storyfield_ai_story_id,
    createStory.id,
  );
  TestValidator.equals("ttsResult dialect initial", ttsResult.dialect, "ko");

  // 6. Owner successfully updates TTS result
  const updateInput = {
    tts_audio_uri: `https://mock-s3.e2e/${RandomGenerator.alphaNumeric(22)}_update.mp3`,
    source_text: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 12,
    }),
    dialect: RandomGenerator.pick([
      "gyeongsang",
      "jeolla",
      "en",
      "ko",
    ] as const), // use a different dialect
    storyfield_ai_story_page_id: page.id,
  } satisfies IStoryfieldAiTtsResult.IUpdate;
  await new Promise((resolve) => setTimeout(resolve, 10)); // fudge audit times
  const updated =
    await api.functional.storyfieldAi.authenticatedUser.stories.ttsResults.update(
      connection,
      {
        storyId: createStory.id,
        ttsResultId: ttsResult.id,
        body: updateInput,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "ttsResult id must not change after update",
    updated.id,
    ttsResult.id,
  );
  TestValidator.equals(
    "updated dialect is reflected",
    updated.dialect,
    updateInput.dialect,
  );
  TestValidator.notEquals(
    "updated_at changes after update",
    updated.updated_at,
    ttsResult.updated_at,
  );
  TestValidator.equals(
    "created_at remains original",
    updated.created_at,
    ttsResult.created_at,
  );

  // 7. Forbidden update by different user
  // -- register a different user and attempt forbidden update
  const extUserId2 = RandomGenerator.alphaNumeric(12);
  const email2 = `${RandomGenerator.alphabets(8)}@e2e-unauth.com`;
  const join2 = await api.functional.auth.authenticatedUser.join(connection, {
    body: {
      external_user_id: extUserId2,
      email: email2,
      actor_type: "authenticatedUser",
    } satisfies IStoryfieldAiAuthenticatedUser.ICreate,
  });
  typia.assert(join2);

  // Switch token (login as second user)
  const login2 = await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: extUserId2,
      email: email2,
    } satisfies IStoryfieldAiAuthenticatedUser.ILogin,
  });
  typia.assert(login2);
  // Attempt update (should fail: forbidden)
  await TestValidator.error(
    "Forbidden update attempt by non-owner should be rejected",
    async () => {
      await api.functional.storyfieldAi.authenticatedUser.stories.ttsResults.update(
        connection,
        {
          storyId: createStory.id,
          ttsResultId: ttsResult.id,
          body: updateInput,
        },
      );
    },
  );

  // 8. Field value business error: set required string fields to empty
  // (simulate missing TTS source_text or empty dialect)
  await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: extUserId,
      email,
    },
  });
  await TestValidator.error(
    "Empty source_text in TTS result update should be rejected",
    async () => {
      await api.functional.storyfieldAi.authenticatedUser.stories.ttsResults.update(
        connection,
        {
          storyId: createStory.id,
          ttsResultId: ttsResult.id,
          body: {
            source_text: "",
          },
        },
      );
    },
  );

  await TestValidator.error(
    "Empty dialect in TTS result update should be rejected",
    async () => {
      await api.functional.storyfieldAi.authenticatedUser.stories.ttsResults.update(
        connection,
        {
          storyId: createStory.id,
          ttsResultId: ttsResult.id,
          body: {
            dialect: "",
          },
        },
      );
    },
  );
}
