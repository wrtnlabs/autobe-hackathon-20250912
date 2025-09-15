import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";

/**
 * Validate successful and failure scenarios for story creation by an
 * authenticated user.
 *
 * 1. Register a new authenticated user (providing unique external_user_id and
 *    email)
 * 2. Authenticated context is automatically established
 * 3. Successfully create a story with unique title and valid language
 * 4. Verify all required fields, audit fields, and ownership
 * 5. Attempt to create a duplicate title for the same user, expect error
 */
export async function test_api_story_creation_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register a new authenticated user (storyfield_ai_authenticatedusers)
  const external_user_id = RandomGenerator.alphaNumeric(12);
  const email = `${RandomGenerator.alphabets(8)}@test-company.com`;
  const userJoin = await api.functional.auth.authenticatedUser.join(
    connection,
    {
      body: {
        external_user_id,
        email,
        actor_type: "authenticatedUser",
      } satisfies IStoryfieldAiAuthenticatedUser.ICreate,
    },
  );
  typia.assert(userJoin);

  // 2. Authenticated context is established via returned token
  // 3. Successfully create a new story
  const title = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const storyBody = {
    title,
    main_plot: RandomGenerator.paragraph({ sentences: 8, wordMin: 5 }),
    language: RandomGenerator.pick([
      "ko",
      "en",
      "ja",
      "zh",
      "de",
      "es",
      "fr",
    ] as const),
  } satisfies IStoryfieldAiStory.ICreate;
  const story =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      { body: storyBody },
    );
  typia.assert(story);
  TestValidator.equals("story title matches", story.title, storyBody.title);
  TestValidator.equals(
    "story language matches",
    story.language,
    storyBody.language,
  );
  TestValidator.equals(
    "main plot matches",
    story.main_plot,
    storyBody.main_plot,
  );
  TestValidator.equals(
    "story owner field matches authenticated user",
    story.storyfield_ai_authenticateduser_id,
    userJoin.id,
  );
  TestValidator.predicate(
    "story id is not empty",
    typeof story.id === "string" && story.id.length > 0,
  );
  TestValidator.predicate(
    "story created_at is ISO 8601",
    typeof story.created_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(story.created_at),
  );

  // 4. Try duplicate title for the same user
  await TestValidator.error("duplicate title should fail", async () => {
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      {
        body: {
          title,
          language: storyBody.language,
          main_plot: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IStoryfieldAiStory.ICreate,
      },
    );
  });
}
