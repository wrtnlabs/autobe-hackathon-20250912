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
 * Validates TTS result creation for an authenticated user's story. Ensures that
 * after onboarding and authentication, the user can create a story, add a page,
 * and then generate a TTS result for that page, and that the system returns the
 * correct TTS result structure. Also checks boundary and error enforcement.
 */
export async function test_api_authenticated_user_story_tts_result_generation(
  connection: api.IConnection,
) {
  // 1. Register a new authenticated user with verified external_user_id and a business-unique email.
  const external_user_id: string = RandomGenerator.alphaNumeric(16);
  const email: string = `${RandomGenerator.alphaNumeric(10)}@autobe-e2e.com`;
  const joinPayload = {
    external_user_id,
    email,
    actor_type: "authenticatedUser",
  } satisfies IStoryfieldAiAuthenticatedUser.ICreate;
  const user: IStoryfieldAiAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.join(connection, {
      body: joinPayload,
    });
  typia.assert(user);
  TestValidator.equals(
    "external_user_id matches",
    user.external_user_id,
    external_user_id,
  );
  TestValidator.equals("email matches", user.email, email);

  // 2. Log in as the created user to construct session context.
  const loginRes = await api.functional.auth.authenticatedUser.login(
    connection,
    {
      body: {
        external_user_id,
        email,
      } satisfies IStoryfieldAiAuthenticatedUser.ILogin,
    },
  );
  typia.assert(loginRes);
  TestValidator.equals("login email", loginRes.email, email);

  // 3. Create a Story associated with user
  const storyBody = {
    title: RandomGenerator.name(3),
    main_plot: RandomGenerator.paragraph({ sentences: 5 }),
    language: "ko-KR",
  } satisfies IStoryfieldAiStory.ICreate;
  const story =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      {
        body: storyBody,
      },
    );
  typia.assert(story);
  TestValidator.equals("story title matches", story.title, storyBody.title);

  // 4. Add a page to the story
  const pageBody = {
    page_number: 1,
    text: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies IStoryfieldAiStoryPage.ICreate;
  const page =
    await api.functional.storyfieldAi.authenticatedUser.stories.pages.create(
      connection,
      {
        storyId: story.id,
        body: pageBody,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "page story id matches",
    page.storyfield_ai_story_id,
    story.id,
  );

  // 5. Submit a TTS result for this page (success path)
  const ttsBody = {
    tts_audio_uri: `https://storage.example.com/audio/${RandomGenerator.alphaNumeric(24)}.mp3`,
    source_text: page.text,
    dialect: story.language,
    storyfield_ai_story_page_id: page.id,
  } satisfies IStoryfieldAiTtsResult.ICreate;
  const ttsResult =
    await api.functional.storyfieldAi.authenticatedUser.stories.ttsResults.create(
      connection,
      {
        storyId: story.id,
        body: ttsBody,
      },
    );
  typia.assert(ttsResult);
  TestValidator.equals(
    "ttsResult.story id matches",
    ttsResult.storyfield_ai_story_id,
    story.id,
  );
  TestValidator.equals(
    "ttsResult.page id matches",
    ttsResult.storyfield_ai_story_page_id,
    page.id,
  );
  TestValidator.equals(
    "ttsResult source text",
    ttsResult.source_text,
    page.text,
  );
  TestValidator.equals(
    "ttsResult dialect matches",
    ttsResult.dialect,
    story.language,
  );
  TestValidator.equals(
    "ttsResult audio URI matches",
    ttsResult.tts_audio_uri,
    ttsBody.tts_audio_uri,
  );

  // 6. Error: Create TTS for non-existent story
  await TestValidator.error("error on non-existent story id", async () => {
    await api.functional.storyfieldAi.authenticatedUser.stories.ttsResults.create(
      connection,
      {
        storyId: typia.random<string & tags.Format<"uuid">>(),
        body: ttsBody,
      },
    );
  });
  // 7. Error: Create TTS for wrong page id (not in story)
  await TestValidator.error(
    "error on invalid storyfield_ai_story_page_id",
    async () => {
      await api.functional.storyfieldAi.authenticatedUser.stories.ttsResults.create(
        connection,
        {
          storyId: story.id,
          body: {
            ...ttsBody,
            storyfield_ai_story_page_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          },
        },
      );
    },
  );
  // 8. Error: Wrong owner - simulate with a second account
  const otherJoin = await api.functional.auth.authenticatedUser.join(
    connection,
    {
      body: {
        external_user_id: RandomGenerator.alphaNumeric(16),
        email: RandomGenerator.alphaNumeric(10) + "@autobe-e2e-2.com",
        actor_type: "authenticatedUser",
      } satisfies IStoryfieldAiAuthenticatedUser.ICreate,
    },
  );
  typia.assert(otherJoin);
  await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: otherJoin.external_user_id,
      email: otherJoin.email,
    } satisfies IStoryfieldAiAuthenticatedUser.ILogin,
  });
  await TestValidator.error(
    "TTS forbidden for other user's story",
    async () => {
      await api.functional.storyfieldAi.authenticatedUser.stories.ttsResults.create(
        connection,
        {
          storyId: story.id,
          body: ttsBody,
        },
      );
    },
  );
}
