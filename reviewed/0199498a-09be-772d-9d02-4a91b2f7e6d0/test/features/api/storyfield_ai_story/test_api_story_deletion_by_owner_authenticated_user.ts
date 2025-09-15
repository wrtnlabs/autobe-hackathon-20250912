import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";

/**
 * Validate permanent deletion (hard delete) of a story by owner authenticated
 * user.
 *
 * Steps:
 *
 * 1. Register and login as authenticated user A (story owner).
 * 2. Create a new AI-generated story as user A.
 * 3. Delete the story as user A (should succeed).
 * 4. Attempt to delete the same story again as user A (should fail: already
 *    deleted).
 * 5. Register/login as a different user B (not owner).
 * 6. Attempt to delete the same story as user B (should fail: forbidden).
 */
export async function test_api_story_deletion_by_owner_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register user A
  const userACreate = {
    external_user_id: RandomGenerator.alphaNumeric(12),
    email: `${RandomGenerator.alphaNumeric(6)}@test-owner.com`,
    actor_type: "authenticatedUser",
  } satisfies IStoryfieldAiAuthenticatedUser.ICreate;
  const userAAuthorized = await api.functional.auth.authenticatedUser.join(
    connection,
    { body: userACreate },
  );
  typia.assert(userAAuthorized);

  // 2. Login as user A
  const userALogin = {
    external_user_id: userACreate.external_user_id,
    email: userACreate.email,
  } satisfies IStoryfieldAiAuthenticatedUser.ILogin;
  const userALoggedIn = await api.functional.auth.authenticatedUser.login(
    connection,
    { body: userALogin },
  );
  typia.assert(userALoggedIn);

  // 3. Create story as user A
  const storyCreate = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    main_plot: RandomGenerator.paragraph(),
    language: "en",
  } satisfies IStoryfieldAiStory.ICreate;
  const story =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      { body: storyCreate },
    );
  typia.assert(story);
  TestValidator.equals(
    "story owner id matches userA",
    story.storyfield_ai_authenticateduser_id,
    userAAuthorized.id,
  );

  // 4. Delete the story as owner (user A)
  await api.functional.storyfieldAi.authenticatedUser.stories.erase(
    connection,
    { storyId: story.id },
  );

  // 5. Attempt to delete same story again as user A (already deleted)
  await TestValidator.error(
    "cannot re-delete already deleted story",
    async () => {
      await api.functional.storyfieldAi.authenticatedUser.stories.erase(
        connection,
        { storyId: story.id },
      );
    },
  );

  // 6. Register user B
  const userBCreate = {
    external_user_id: RandomGenerator.alphaNumeric(12),
    email: `${RandomGenerator.alphaNumeric(6)}@test-rival.com`,
    actor_type: "authenticatedUser",
  } satisfies IStoryfieldAiAuthenticatedUser.ICreate;
  const userBAuthorized = await api.functional.auth.authenticatedUser.join(
    connection,
    { body: userBCreate },
  );
  typia.assert(userBAuthorized);

  // 7. Login as user B
  const userBLogin = {
    external_user_id: userBCreate.external_user_id,
    email: userBCreate.email,
  } satisfies IStoryfieldAiAuthenticatedUser.ILogin;
  const userBLoggedIn = await api.functional.auth.authenticatedUser.login(
    connection,
    { body: userBLogin },
  );
  typia.assert(userBLoggedIn);

  // 8. User B attempts to delete A's story (should fail with forbidden)
  await TestValidator.error(
    "user B cannot delete another user's story",
    async () => {
      await api.functional.storyfieldAi.authenticatedUser.stories.erase(
        connection,
        { storyId: story.id },
      );
    },
  );
}
