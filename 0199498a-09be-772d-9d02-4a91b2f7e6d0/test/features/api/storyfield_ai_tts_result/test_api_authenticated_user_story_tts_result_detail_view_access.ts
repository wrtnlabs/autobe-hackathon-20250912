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
 * Test authenticated user TTS result detail view access and enforcement.
 *
 * 1. Register a new authenticated user.
 * 2. Log in as that user.
 * 3. Create a new story.
 * 4. Add a page to the story.
 * 5. Create a TTS result for that story page.
 * 6. Retrieve TTS result details by ID and validate key properties for the owner.
 * 7. Attempt detail retrieval with a non-existent TTS result ID and expect error.
 * 8. Register a second user, log in as them, and attempt access to the first
 *    user's TTS result (should fail).
 */
export async function test_api_authenticated_user_story_tts_result_detail_view_access(
  connection: api.IConnection,
) {
  // 1. Register a new authenticated user
  const externalUserId: string = RandomGenerator.alphaNumeric(16);
  const email: string = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const userJoin = await api.functional.auth.authenticatedUser.join(
    connection,
    {
      body: {
        external_user_id: externalUserId,
        email,
        actor_type: "authenticatedUser",
      },
    },
  );
  typia.assert(userJoin);

  // 2. Log in as the authenticated user
  const auth = await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: externalUserId,
      email,
    },
  });
  typia.assert(auth);

  // 3. Create a story
  const storyTitle = RandomGenerator.paragraph({ sentences: 2 });
  const story =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      {
        body: {
          title: storyTitle,
          main_plot: RandomGenerator.paragraph({ sentences: 4 }),
          language: "ko-KR",
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
          page_number: 1 as number & tags.Type<"int32">,
          text: RandomGenerator.paragraph({ sentences: 10 }),
        },
      },
    );
  typia.assert(page);

  // 5. Create a TTS result for the page
  const ttsAudioUri = `https://audio.example.com/${RandomGenerator.alphaNumeric(12)}.mp3`;
  const ttsResult =
    await api.functional.storyfieldAi.authenticatedUser.stories.ttsResults.create(
      connection,
      {
        storyId: story.id,
        body: {
          tts_audio_uri: ttsAudioUri,
          source_text: page.text,
          dialect: story.language,
          storyfield_ai_story_page_id: page.id,
        },
      },
    );
  typia.assert(ttsResult);

  // 6. Retrieve TTS result details by ID as owner
  const fetched =
    await api.functional.storyfieldAi.authenticatedUser.stories.ttsResults.at(
      connection,
      {
        storyId: story.id,
        ttsResultId: ttsResult.id,
      },
    );
  typia.assert(fetched);
  TestValidator.equals(
    "tts result detail id matches",
    fetched.id,
    ttsResult.id,
  );
  TestValidator.equals(
    "tts result story id matches",
    fetched.storyfield_ai_story_id,
    story.id,
  );
  TestValidator.equals(
    "tts audio uri matches",
    fetched.tts_audio_uri,
    ttsAudioUri,
  );
  TestValidator.equals(
    "tts result story page id matches",
    fetched.storyfield_ai_story_page_id,
    page.id,
  );

  // 7. Attempt retrieve with non-existent TTS result id
  const fakeTtsId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent tts result should error",
    async () => {
      await api.functional.storyfieldAi.authenticatedUser.stories.ttsResults.at(
        connection,
        {
          storyId: story.id,
          ttsResultId: fakeTtsId,
        },
      );
    },
  );

  // 8. Register a second authenticated user and attempt access to the first user's TTS result
  const anotherExternalId: string = RandomGenerator.alphaNumeric(16);
  const anotherEmail: string = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const anotherUser = await api.functional.auth.authenticatedUser.join(
    connection,
    {
      body: {
        external_user_id: anotherExternalId,
        email: anotherEmail,
        actor_type: "authenticatedUser",
      },
    },
  );
  typia.assert(anotherUser);
  const anotherAuth = await api.functional.auth.authenticatedUser.login(
    connection,
    {
      body: {
        external_user_id: anotherExternalId,
        email: anotherEmail,
      },
    },
  );
  typia.assert(anotherAuth);
  await TestValidator.error(
    "non-owner cannot view tts result detail",
    async () => {
      await api.functional.storyfieldAi.authenticatedUser.stories.ttsResults.at(
        connection,
        {
          storyId: story.id,
          ttsResultId: ttsResult.id,
        },
      );
    },
  );
}
