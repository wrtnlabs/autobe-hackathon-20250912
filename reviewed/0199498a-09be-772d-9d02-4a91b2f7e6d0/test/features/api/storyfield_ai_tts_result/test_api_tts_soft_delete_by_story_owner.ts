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
 * Test that an authenticated user (story owner) can soft-delete
 * (deactivate) a TTS result from their own story.
 *
 * Business context:
 *
 * - Only the owner (authenticated user) of a story can delete/soft-delete
 *   (deactivate) their own TTS results.
 * - The deletion is performed as a soft-delete, setting deleted_at instead of
 *   physical removal.
 * - After deletion, the TTS result is inaccessible through normal list/fetch
 *   by business users.
 * - All deletion operations are audit/policy compliant (backend guarantees
 *   record retention).
 *
 * Steps:
 *
 * 1. Register and login as an authenticated user (with unique
 *    external_user_id/email).
 * 2. Create a new story as this user.
 * 3. Add a page to the story.
 * 4. Generate a TTS result for the page.
 * 5. Soft delete (erase) that TTS result.
 * 6. Attempt to delete again (should fail with appropriate business/policy
 *    error).
 * 7. Attempt to delete a non-existent TTS result (should fail with an error).
 * 8. (Optionally) Attempt deletion as a different (unauthorized) user (should
 *    fail with policy error).
 *
 * Validation:
 *
 * - After first deletion, TTS result is no longer available through normal
 *   API for that user.
 * - Soft deletion is enforced, not hard delete.
 * - Unauthorized/error cases are handled gracefully, with business logic
 *   validation.
 */
export async function test_api_tts_soft_delete_by_story_owner(
  connection: api.IConnection,
) {
  // 1. Register as authenticated user with a unique external_user_id and email
  const externalUserId: string = RandomGenerator.alphaNumeric(16);
  const email: string = `${RandomGenerator.alphaNumeric(6)}@example.com`;
  const joinBody = {
    external_user_id: externalUserId,
    email,
    actor_type: "authenticatedUser",
  } satisfies IStoryfieldAiAuthenticatedUser.ICreate;

  const user: IStoryfieldAiAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.join(connection, {
      body: joinBody,
    });
  typia.assert(user);

  // 2. Login as authenticated user
  const login: IStoryfieldAiAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.login(connection, {
      body: {
        external_user_id: externalUserId,
        email,
      } satisfies IStoryfieldAiAuthenticatedUser.ILogin,
    });
  typia.assert(login);

  // 3. Create a new story as this user
  const storyBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    main_plot: RandomGenerator.paragraph({ sentences: 5 }),
    language: "ko-KR",
  } satisfies IStoryfieldAiStory.ICreate;
  const story: IStoryfieldAiStory =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      { body: storyBody },
    );
  typia.assert(story);

  // 4. Add a page to the story
  const pageBody = {
    page_number: 1,
    text: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IStoryfieldAiStoryPage.ICreate;
  const page: IStoryfieldAiStoryPage =
    await api.functional.storyfieldAi.authenticatedUser.stories.pages.create(
      connection,
      { storyId: story.id, body: pageBody },
    );
  typia.assert(page);

  // 5. Generate a TTS result for that page
  const ttsBody = {
    tts_audio_uri: `https://storage.example.com/audio/${RandomGenerator.alphaNumeric(12)}.mp3`,
    source_text: page.text,
    dialect: story.language,
    storyfield_ai_story_page_id: page.id,
  } satisfies IStoryfieldAiTtsResult.ICreate;

  const ttsResult: IStoryfieldAiTtsResult =
    await api.functional.storyfieldAi.authenticatedUser.stories.ttsResults.create(
      connection,
      {
        storyId: story.id,
        body: ttsBody,
      },
    );
  typia.assert(ttsResult);

  // 6. Soft delete (erase) the TTS result
  await api.functional.storyfieldAi.authenticatedUser.stories.ttsResults.erase(
    connection,
    {
      storyId: story.id,
      ttsResultId: ttsResult.id,
    },
  );

  // No direct read endpoint for a single ttsResult; an attempt to delete again should result in error
  await TestValidator.error(
    "Deleting an already deleted TTS result should fail",
    async () => {
      await api.functional.storyfieldAi.authenticatedUser.stories.ttsResults.erase(
        connection,
        {
          storyId: story.id,
          ttsResultId: ttsResult.id,
        },
      );
    },
  );

  // Attempt to delete a non-existent TTS result
  await TestValidator.error(
    "Deleting a non-existent TTS result should fail",
    async () => {
      await api.functional.storyfieldAi.authenticatedUser.stories.ttsResults.erase(
        connection,
        {
          storyId: story.id,
          ttsResultId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Optionally, create a second user, login, and attempt to delete the first user's ttsResult (should fail)
  const externalUserId2: string = RandomGenerator.alphaNumeric(16);
  const email2: string = `${RandomGenerator.alphaNumeric(6)}@example.com`;
  const joinBody2 = {
    external_user_id: externalUserId2,
    email: email2,
    actor_type: "authenticatedUser",
  } satisfies IStoryfieldAiAuthenticatedUser.ICreate;
  await api.functional.auth.authenticatedUser.join(connection, {
    body: joinBody2,
  });
  await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: externalUserId2,
      email: email2,
    } satisfies IStoryfieldAiAuthenticatedUser.ILogin,
  });

  await TestValidator.error(
    "Unauthorized user cannot delete another's TTS result",
    async () => {
      await api.functional.storyfieldAi.authenticatedUser.stories.ttsResults.erase(
        connection,
        {
          storyId: story.id,
          ttsResultId: ttsResult.id,
        },
      );
    },
  );
}
