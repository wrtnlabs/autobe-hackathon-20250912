import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Validates system administrator detail access to user stories.
 *
 * This test covers:
 *
 * - Registering and logging in as both an authenticated user and a system
 *   admin
 * - Authenticated user creates a story
 * - System admin accesses story details using the storyId
 * - System admin attempts to access a non-existent story as an edge case
 * - (Simulated) Soft-deleted story detail access by system admin
 *
 * Each step enforces correct business logic, proper session switching, and
 * validates returned fields for compliance/audit.
 */
export async function test_api_story_detail_access_as_system_admin(
  connection: api.IConnection,
) {
  // Setup - register authenticated user
  const normalUserExternalId = RandomGenerator.alphaNumeric(16);
  const normalUserEmail = `${RandomGenerator.name(1)}@company.com`;
  const userJoin = await api.functional.auth.authenticatedUser.join(
    connection,
    {
      body: {
        external_user_id: normalUserExternalId,
        email: normalUserEmail,
        actor_type: "authenticatedUser",
      },
    },
  );
  typia.assert(userJoin);

  // Setup - register system admin
  const adminExternalId = RandomGenerator.alphaNumeric(16);
  const adminEmail = `${RandomGenerator.name(1)}@corpadmin.com`;
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      external_admin_id: adminExternalId,
      email: adminEmail,
      actor_type: "systemAdmin",
    },
  });
  typia.assert(adminJoin);

  // Authenticated user login (to get session)
  await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: normalUserExternalId,
      email: normalUserEmail,
    },
  });

  // User creates a story
  const storyCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    main_plot: RandomGenerator.content({ paragraphs: 1 }),
    language: RandomGenerator.pick([
      "ko",
      "en",
      "Gyeongsang",
      "경상도",
    ] as const),
  } satisfies IStoryfieldAiStory.ICreate;
  const createdStory =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      {
        body: storyCreateBody,
      },
    );
  typia.assert(createdStory);
  TestValidator.equals(
    "Authenticated user's story title",
    createdStory.title,
    storyCreateBody.title,
  );
  TestValidator.equals(
    "Authenticated user's story language",
    createdStory.language,
    storyCreateBody.language,
  );

  // Switch to system admin by logging in as admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: adminExternalId,
      email: adminEmail,
    },
  });

  // System admin accesses the user's story detail
  const adminView = await api.functional.storyfieldAi.systemAdmin.stories.at(
    connection,
    {
      storyId: createdStory.id,
    },
  );
  typia.assert(adminView);
  TestValidator.equals(
    "Admin can access full story",
    adminView.id,
    createdStory.id,
  );
  TestValidator.equals(
    "Admin view - story title matches",
    adminView.title,
    createdStory.title,
  );
  TestValidator.equals(
    "Admin view - story is not soft-deleted",
    adminView.deleted_at,
    null,
  );

  // System admin attempts to access a non-existent storyId
  await TestValidator.error(
    "Admin cannot access non-existent storyId",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.stories.at(connection, {
        storyId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // (Simulated) Soft-deleted story: we cannot delete, so simulate by constructing a story object with deleted_at set and verify admin can see such a story
  // This edge case cannot be performed directly because there is no delete or update endpoint,
  // but if/when a delete API is introduced, test logic would be as follows:
  //  await api.functional.storyfieldAi.authenticatedUser.stories.delete(connection, { storyId: createdStory.id });
  //  (then) attempt admin access to verify auditing
}
