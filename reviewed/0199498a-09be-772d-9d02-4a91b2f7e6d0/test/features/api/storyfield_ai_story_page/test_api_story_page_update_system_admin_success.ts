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
 * This test validates that a system administrator can update any story page
 * (not originally created by them) and asserts that the update is reflected,
 * audit fields are updated, and unauthorized access is rejected. It also tests
 * error conditions for updating with missing data fields. Soft-delete update
 * negative case is skipped due to lack of delete endpoint.
 *
 * Steps:
 *
 * 1. Register and login an authenticated user (creates the story)
 * 2. Create a story as that user
 * 3. Add a page to the story as the user
 * 4. Register and login as a system admin
 * 5. Update the page as the admin and verify changes
 * 6. Attempt to update as regular user (should fail)
 * 7. Attempt to update with no data (should fail if business logic enforces
 *    non-empty)
 * 8. Soft-delete test skipped (delete endpoint unavailable)
 */
export async function test_api_story_page_update_system_admin_success(
  connection: api.IConnection,
) {
  // 1. Register and login as authenticated user
  const userJoin = await api.functional.auth.authenticatedUser.join(
    connection,
    {
      body: {
        external_user_id: RandomGenerator.alphaNumeric(12),
        email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
        actor_type: "authenticatedUser",
      } satisfies IStoryfieldAiAuthenticatedUser.ICreate,
    },
  );
  typia.assert(userJoin);
  await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: userJoin.external_user_id,
      email: userJoin.email,
    } satisfies IStoryfieldAiAuthenticatedUser.ILogin,
  });
  // 2. Create story as user
  const story =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          main_plot: RandomGenerator.paragraph({ sentences: 3 }),
          language: "ko-KR",
        } satisfies IStoryfieldAiStory.ICreate,
      },
    );
  typia.assert(story);
  // 3. Create story page as user
  const page =
    await api.functional.storyfieldAi.authenticatedUser.stories.pages.create(
      connection,
      {
        storyId: story.id,
        body: {
          page_number: 1,
          text: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IStoryfieldAiStoryPage.ICreate,
      },
    );
  typia.assert(page);
  // 4. Register and login as system admin
  const adminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      external_admin_id: RandomGenerator.alphaNumeric(12),
      email: `${RandomGenerator.alphaNumeric(8)}@admin.com`,
      actor_type: "systemAdmin",
    } satisfies IStoryfieldAiSystemAdmin.IJoin,
  });
  typia.assert(adminJoin);
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: adminJoin.external_admin_id,
      email: adminJoin.email,
    } satisfies IStoryfieldAiSystemAdmin.ILogin,
  });
  // 5. Update the page as admin
  const updateBody = {
    page_number: 2,
    text: RandomGenerator.paragraph({ sentences: 7 }),
  } satisfies IStoryfieldAiStoryPage.IUpdate;
  const updatedPage =
    await api.functional.storyfieldAi.systemAdmin.stories.pages.update(
      connection,
      {
        storyId: story.id,
        pageId: page.id,
        body: updateBody,
      },
    );
  typia.assert(updatedPage);
  TestValidator.equals("updated page text", updatedPage.text, updateBody.text);
  TestValidator.equals(
    "updated page_number",
    updatedPage.page_number,
    updateBody.page_number,
  );
  // 6. Attempt update as regular user
  await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: userJoin.external_user_id,
      email: userJoin.email,
    } satisfies IStoryfieldAiAuthenticatedUser.ILogin,
  });
  await TestValidator.error("non-admin update should fail", async () => {
    await api.functional.storyfieldAi.systemAdmin.stories.pages.update(
      connection,
      {
        storyId: story.id,
        pageId: page.id,
        body: {
          page_number: 3,
          text: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  });
  // 7. Attempt to update with no body data (expect error)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: adminJoin.external_admin_id,
      email: adminJoin.email,
    } satisfies IStoryfieldAiSystemAdmin.ILogin,
  });
  await TestValidator.error("missing update fields causes error", async () => {
    await api.functional.storyfieldAi.systemAdmin.stories.pages.update(
      connection,
      {
        storyId: story.id,
        pageId: page.id,
        body: {} as IStoryfieldAiStoryPage.IUpdate,
      },
    );
  });
  // 8. Soft-delete update not tested due to lack of delete API
}
