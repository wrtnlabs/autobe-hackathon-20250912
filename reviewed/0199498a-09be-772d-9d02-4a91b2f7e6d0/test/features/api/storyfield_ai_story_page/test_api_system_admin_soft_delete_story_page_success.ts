import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import type { IStoryfieldAiStoryPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryPage";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Validate system admin soft-deletion of a user's story page, including full
 * access and authorization scenarios. Covers admin deletion, error flow for
 * repeated deletion, non-existent page deletion, and non-admin attempts. No
 * detail query for post-soft-deletion is possible (no SDK endpoint) but full
 * API error/permission flows are validated.
 *
 * Steps:
 *
 * 1. Register systemAdmin and authenticatedUser test actors (unique per test)
 * 2. As authenticatedUser, create a new story and page
 * 3. Switch to systemAdmin, soft-delete the page by erase endpoint
 * 4. Attempt to delete again (should fail: already deleted)
 * 5. Attempt to delete random (non-existent) page (should fail)
 * 6. Switch to authenticatedUser, attempt deletion (should fail: not authorized)
 */
export async function test_api_system_admin_soft_delete_story_page_success(
  connection: api.IConnection,
) {
  // 1. Register actors
  const external_admin_id: string = RandomGenerator.alphaNumeric(12);
  const admin_email: string = `${RandomGenerator.name(1)}@admin.com`;
  const external_user_id: string = RandomGenerator.alphaNumeric(12);
  const user_email: string = `${RandomGenerator.name(1)}@user.com`;

  // Register & login as systemAdmin
  const admin: IStoryfieldAiSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        external_admin_id,
        email: admin_email,
        actor_type: "systemAdmin",
      },
    });
  typia.assert(admin);

  // Register & login as authenticated user
  const user: IStoryfieldAiAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.join(connection, {
      body: {
        external_user_id,
        email: user_email,
        actor_type: "authenticatedUser",
      },
    });
  typia.assert(user);

  // Login as authenticated user (to set connection context)
  await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id,
      email: user_email,
    },
  });

  // 2. Create story and a page as user
  const storyBody = {
    title: RandomGenerator.name(2),
    main_plot: RandomGenerator.paragraph(),
    language: "ko",
  } satisfies IStoryfieldAiStory.ICreate;
  const story: IStoryfieldAiStory =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      {
        body: storyBody,
      },
    );
  typia.assert(story);

  const pageBody = {
    page_number: 1,
    text: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IStoryfieldAiStoryPage.ICreate;
  const page: IStoryfieldAiStoryPage =
    await api.functional.storyfieldAi.authenticatedUser.stories.pages.create(
      connection,
      {
        storyId: story.id,
        body: pageBody,
      },
    );
  typia.assert(page);

  // 3. Switch to systemAdmin, soft-delete the page
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id,
      email: admin_email,
    },
  });

  await api.functional.storyfieldAi.systemAdmin.stories.pages.erase(
    connection,
    {
      storyId: story.id,
      pageId: page.id,
    },
  );

  // 4. Attempt to delete again (already soft-deleted)
  await TestValidator.error(
    "systemAdmin cannot delete already soft-deleted page",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.stories.pages.erase(
        connection,
        {
          storyId: story.id,
          pageId: page.id,
        },
      );
    },
  );

  // 5. Attempt to delete non-existent page
  const fakePageId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "systemAdmin cannot delete non-existent page",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.stories.pages.erase(
        connection,
        {
          storyId: story.id,
          pageId: fakePageId,
        },
      );
    },
  );

  // 6. Switch to authenticatedUser, attempt deletion (should fail)
  await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id,
      email: user_email,
    },
  });
  await TestValidator.error(
    "authenticatedUser cannot soft-delete story page as non-admin",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.stories.pages.erase(
        connection,
        {
          storyId: story.id,
          pageId: page.id,
        },
      );
    },
  );
}
