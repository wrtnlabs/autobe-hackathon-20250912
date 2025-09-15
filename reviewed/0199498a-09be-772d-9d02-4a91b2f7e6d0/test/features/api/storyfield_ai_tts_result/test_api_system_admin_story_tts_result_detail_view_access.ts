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
 * Ensure that a system administrator can view the full details of any TTS
 * result for a story, regardless of ownership.
 *
 * 1. Register and log in a systemAdmin
 * 2. Register and log in an authenticatedUser
 * 3. AuthenticatedUser creates a story
 * 4. AuthenticatedUser adds a page to that story
 * 5. AuthenticatedUser generates a TTS result for the page
 * 6. Log back in as systemAdmin
 * 7. Access the TTS result detail via admin endpoint
 * 8. Validate detail retrieval (all fields match the created record)
 * 9. Try to fetch a non-existent TTSResult (expect error)
 * 10. Log in as unrelated authenticatedUser, try fetch (expect error)
 */
export async function test_api_system_admin_story_tts_result_detail_view_access(
  connection: api.IConnection,
) {
  // 1. Register and login as systemAdmin
  const systemAdmin_external_admin_id = RandomGenerator.alphaNumeric(10);
  const systemAdmin_email = `${RandomGenerator.alphabets(6)}@admin.com`;
  const systemAdminJoin = {
    external_admin_id: systemAdmin_external_admin_id,
    email: systemAdmin_email,
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const systemAdminAuth = await api.functional.auth.systemAdmin.join(
    connection,
    { body: systemAdminJoin },
  );
  typia.assert(systemAdminAuth);

  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: systemAdmin_external_admin_id,
      email: systemAdmin_email,
    } satisfies IStoryfieldAiSystemAdmin.ILogin,
  });

  // 2. Register and login as content-owner authenticatedUser
  const user_external_user_id = RandomGenerator.alphaNumeric(12);
  const user_email = `${RandomGenerator.alphabets(8)}@user.com`;
  const userJoin = {
    external_user_id: user_external_user_id,
    email: user_email,
    actor_type: "authenticatedUser",
  } satisfies IStoryfieldAiAuthenticatedUser.ICreate;
  const userAuth = await api.functional.auth.authenticatedUser.join(
    connection,
    { body: userJoin },
  );
  typia.assert(userAuth);
  await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: user_external_user_id,
      email: user_email,
    } satisfies IStoryfieldAiAuthenticatedUser.ILogin,
  });

  // 3. Create a story
  const storyCreate = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    main_plot: RandomGenerator.paragraph({ sentences: 6 }),
    language: "ko-KR",
  } satisfies IStoryfieldAiStory.ICreate;
  const story =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      { body: storyCreate },
    );
  typia.assert(story);

  // 4. Create a story page
  const pageCreate = {
    page_number: 1 as number & tags.Type<"int32">,
    text: RandomGenerator.content({ paragraphs: 1, sentenceMin: 8 }),
  } satisfies IStoryfieldAiStoryPage.ICreate;
  const page =
    await api.functional.storyfieldAi.authenticatedUser.stories.pages.create(
      connection,
      { storyId: story.id, body: pageCreate },
    );
  typia.assert(page);

  // 5. Generate a TTS result for the page
  const ttsResultCreate = {
    tts_audio_uri: `https://audio.example.com/${RandomGenerator.alphaNumeric(12)}.mp3`,
    source_text: page.text,
    dialect: story.language,
    storyfield_ai_story_page_id: page.id,
  } satisfies IStoryfieldAiTtsResult.ICreate;
  const ttsResult =
    await api.functional.storyfieldAi.authenticatedUser.stories.ttsResults.create(
      connection,
      { storyId: story.id, body: ttsResultCreate },
    );
  typia.assert(ttsResult);

  // 6. Log back in as systemAdmin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: systemAdmin_external_admin_id,
      email: systemAdmin_email,
    } satisfies IStoryfieldAiSystemAdmin.ILogin,
  });

  // 7. Fetch TTS result detail as systemAdmin
  const ttsResultDetail =
    await api.functional.storyfieldAi.systemAdmin.stories.ttsResults.at(
      connection,
      {
        storyId: story.id,
        ttsResultId: ttsResult.id,
      },
    );
  typia.assert(ttsResultDetail);
  TestValidator.equals(
    "system admin can get TTS result details",
    ttsResultDetail,
    ttsResult,
  );

  // 8. Try to get non-existent TTSResult (expect error)
  const randomTtsResultId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "system admin get non-existent TTS result",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.stories.ttsResults.at(
        connection,
        {
          storyId: story.id,
          ttsResultId: randomTtsResultId,
        },
      );
    },
  );

  // 9. Create unrelated authenticatedUser, login as this new user
  const another_external_user_id = RandomGenerator.alphaNumeric(12);
  const another_email = `${RandomGenerator.alphabets(8)}@user.com`;
  await api.functional.auth.authenticatedUser.join(connection, {
    body: {
      external_user_id: another_external_user_id,
      email: another_email,
      actor_type: "authenticatedUser",
    } satisfies IStoryfieldAiAuthenticatedUser.ICreate,
  });
  await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: another_external_user_id,
      email: another_email,
    } satisfies IStoryfieldAiAuthenticatedUser.ILogin,
  });

  // 10. Try to access the admin TTS view endpoint as this ordinary user (expect error)
  await TestValidator.error(
    "non-admin/non-owner is denied admin TTS result detail",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.stories.ttsResults.at(
        connection,
        {
          storyId: story.id,
          ttsResultId: ttsResult.id,
        },
      );
    },
  );
}
