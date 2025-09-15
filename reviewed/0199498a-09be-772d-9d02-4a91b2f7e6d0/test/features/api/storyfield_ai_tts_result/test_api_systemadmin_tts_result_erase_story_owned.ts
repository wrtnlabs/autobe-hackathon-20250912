import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";
import type { IStoryfieldAiTtsResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiTtsResult";

/**
 * Validate that system admin can erase any story's TTS result regardless of
 * ownership, and that soft-deletion takes effect (cannot erase twice, error on
 * missing).
 *
 * 1. Register and log in as systemAdmin
 * 2. Register and log in as authenticatedUser
 * 3. AuthenticatedUser creates a story
 * 4. AuthenticatedUser creates a TTS result for that story
 * 5. SystemAdmin logs in and erases the TTS result by id
 * 6. Attempting to erase the same TTS again returns error (already deleted)
 * 7. Attempting to erase a (random/non-existent) TTS id returns error
 */
export async function test_api_systemadmin_tts_result_erase_story_owned(
  connection: api.IConnection,
) {
  // 1. Create systemAdmin and authenticatedUser
  const sysAdminExternalId = RandomGenerator.alphaNumeric(16);
  const sysAdminEmail = `${RandomGenerator.name(1)}@admin.test.com`;
  const adminAuth = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      external_admin_id: sysAdminExternalId,
      email: sysAdminEmail,
      actor_type: "systemAdmin",
    },
  });
  typia.assert(adminAuth);

  const authedUserExternalId = RandomGenerator.alphaNumeric(16);
  const authedUserEmail = `${RandomGenerator.name(1)}@user.test.com`;
  const userAuth = await api.functional.auth.authenticatedUser.join(
    connection,
    {
      body: {
        external_user_id: authedUserExternalId,
        email: authedUserEmail,
        actor_type: "authenticatedUser",
      },
    },
  );
  typia.assert(userAuth);

  // 2. Log in as authenticatedUser
  await api.functional.auth.authenticatedUser.login(connection, {
    body: { external_user_id: authedUserExternalId, email: authedUserEmail },
  });

  // 3. Create a story as authenticatedUser
  const story =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          main_plot: RandomGenerator.paragraph({ sentences: 5 }),
          language: "ko",
        },
      },
    );
  typia.assert(story);

  // 4. Create a TTS result for this story
  const ttsResult =
    await api.functional.storyfieldAi.authenticatedUser.stories.ttsResults.create(
      connection,
      {
        storyId: story.id,
        body: {
          tts_audio_uri: `https://storage.test/${RandomGenerator.alphaNumeric(8)}.mp3`,
          source_text: RandomGenerator.content({ paragraphs: 2 }),
          dialect: "standard",
          storyfield_ai_story_page_id: null,
        },
      },
    );
  typia.assert(ttsResult);

  // 5. Switch role: log in as systemAdmin
  await api.functional.auth.systemAdmin.login(connection, {
    body: { external_admin_id: sysAdminExternalId, email: sysAdminEmail },
  });

  // 6. Delete TTS result as admin
  await api.functional.storyfieldAi.systemAdmin.stories.ttsResults.erase(
    connection,
    {
      storyId: story.id,
      ttsResultId: ttsResult.id,
    },
  );

  // 7. Try deleting the same TTS result again: expect error
  await TestValidator.error(
    "erase already deleted TTS result returns error",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.stories.ttsResults.erase(
        connection,
        {
          storyId: story.id,
          ttsResultId: ttsResult.id,
        },
      );
    },
  );

  // 8. Try deleting a random/non-existent TTS id: expect error
  await TestValidator.error(
    "erase non-existent TTS result returns error",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.stories.ttsResults.erase(
        connection,
        {
          storyId: story.id,
          ttsResultId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
