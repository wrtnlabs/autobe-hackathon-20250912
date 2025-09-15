import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * End-to-end test for hard deletion of a story by a system administrator.
 *
 * Steps:
 *
 * 1. Register & login as a system admin with unique credentials.
 * 2. Register an authenticated user and login.
 * 3. Create a story as that user (capture storyId).
 * 4. Switch back to system admin by login.
 * 5. Delete the created story using the system admin API.
 * 6. Verify hard deletion by attempting a repeat delete (expect error).
 * 7. Attempt to delete a random non-existent storyId (expect error).
 */
export async function test_api_story_deletion_by_system_admin(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminExternalId = RandomGenerator.alphaNumeric(16);

  const sysAdminJoin: IStoryfieldAiSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: sysAdminEmail,
        external_admin_id: sysAdminExternalId,
        actor_type: "systemAdmin",
      } satisfies IStoryfieldAiSystemAdmin.IJoin,
    });
  typia.assert(sysAdminJoin);

  // Explicit login step (to guarantee token set for system admin actions)
  const sysAdminAuth: IStoryfieldAiSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: sysAdminEmail,
        external_admin_id: sysAdminExternalId,
      } satisfies IStoryfieldAiSystemAdmin.ILogin,
    });
  typia.assert(sysAdminAuth);

  // 2. Register and login as authenticatedUser
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userExternalId = RandomGenerator.alphaNumeric(16);

  const authUser: IStoryfieldAiAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.join(connection, {
      body: {
        email: userEmail,
        external_user_id: userExternalId,
        actor_type: "authenticatedUser",
      } satisfies IStoryfieldAiAuthenticatedUser.ICreate,
    });
  typia.assert(authUser);

  const authUserAuth: IStoryfieldAiAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.login(connection, {
      body: {
        email: userEmail,
        external_user_id: userExternalId,
      } satisfies IStoryfieldAiAuthenticatedUser.ILogin,
    });
  typia.assert(authUserAuth);

  // 3. Create a story as the authenticated user
  const storyCreate = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 8 }),
    main_plot: RandomGenerator.paragraph({ sentences: 3 }),
    language: RandomGenerator.pick([
      "ko",
      "en",
      "ja",
      "zh",
      "es",
      "fr",
      "de",
    ] as const),
  } satisfies IStoryfieldAiStory.ICreate;
  const createdStory: IStoryfieldAiStory =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      { body: storyCreate },
    );
  typia.assert(createdStory);
  TestValidator.equals(
    "story title matches input",
    createdStory.title,
    storyCreate.title,
  );
  TestValidator.equals(
    "story language matches input",
    createdStory.language,
    storyCreate.language,
  );

  // 4. Switch back to system admin for privileged delete
  const sysAdminAuthAgain: IStoryfieldAiSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        email: sysAdminEmail,
        external_admin_id: sysAdminExternalId,
      } satisfies IStoryfieldAiSystemAdmin.ILogin,
    });
  typia.assert(sysAdminAuthAgain);

  // 5. Perform privileged delete
  await api.functional.storyfieldAi.systemAdmin.stories.erase(connection, {
    storyId: createdStory.id,
  });

  // 6. Attempt to re-delete same storyId (must error)
  await TestValidator.error(
    "deleting already hard-deleted story returns error",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.stories.erase(connection, {
        storyId: createdStory.id,
      });
    },
  );

  // 7. Attempt to delete a random non-existent storyId
  await TestValidator.error(
    "deleting non-existent storyId results in error",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.stories.erase(connection, {
        storyId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
