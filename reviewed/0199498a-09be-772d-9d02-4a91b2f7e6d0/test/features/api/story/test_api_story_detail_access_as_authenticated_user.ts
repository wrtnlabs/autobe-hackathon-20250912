import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";

/**
 * Validate retrieving story detail as an authenticated user.
 *
 * 1. Register new authenticated user (with unique email/external_user_id).
 * 2. User creates a new story.
 * 3. User fetches their own story's detail and validates all fields and ownership.
 * 4. Negative scenario - fetch detail with a random (non-existent) storyId and
 *    expect failure.
 */
export async function test_api_story_detail_access_as_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register new authenticated user
  const externalUserId = RandomGenerator.alphaNumeric(12);
  const email = `${RandomGenerator.alphaNumeric(8)}@test.com`;
  const joinResult = await api.functional.auth.authenticatedUser.join(
    connection,
    {
      body: {
        external_user_id: externalUserId,
        email,
        actor_type: "authenticatedUser",
      },
    },
  );
  typia.assert(joinResult);

  // 2. User creates new story
  const storyCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    main_plot: RandomGenerator.paragraph({ sentences: 3 }),
    language: RandomGenerator.pick([
      "ko",
      "en",
      "ja",
      "zh",
      "경상도",
      "전라도",
      "충청도",
    ] as const),
  };
  const story =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      { body: storyCreateBody },
    );
  typia.assert(story);

  // 3. Retrieve own story detail
  const fetched =
    await api.functional.storyfieldAi.authenticatedUser.stories.at(connection, {
      storyId: story.id,
    });
  typia.assert(fetched);
  // Basic content assertions
  TestValidator.equals("story id matches", fetched.id, story.id);
  TestValidator.equals(
    "story owner id matches authenticated user",
    fetched.storyfield_ai_authenticateduser_id,
    joinResult.id,
  );
  TestValidator.equals(
    "story title matches",
    fetched.title,
    storyCreateBody.title,
  );
  TestValidator.equals(
    "story main_plot matches",
    fetched.main_plot,
    storyCreateBody.main_plot,
  );
  TestValidator.equals(
    "story language matches",
    fetched.language,
    storyCreateBody.language,
  );
  TestValidator.predicate(
    "story created_at is ISO 8601",
    typeof fetched.created_at === "string" && /T.*Z$/.test(fetched.created_at),
  );
  TestValidator.predicate(
    "story updated_at is ISO 8601",
    typeof fetched.updated_at === "string" && /T.*Z$/.test(fetched.updated_at),
  );
  TestValidator.equals("story is not soft-deleted", fetched.deleted_at, null);

  // 4. Negative: fetching non-existent storyId throws error
  await TestValidator.error(
    "fetching non-existent storyId should fail",
    async () => {
      await api.functional.storyfieldAi.authenticatedUser.stories.at(
        connection,
        {
          storyId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
