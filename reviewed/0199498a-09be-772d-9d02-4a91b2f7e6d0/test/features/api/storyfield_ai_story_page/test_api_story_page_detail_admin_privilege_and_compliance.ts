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
 * Validate system admin privilege to retrieve any story page detail and
 * compliance fields.
 *
 * 1. Register and login as system admin (to establish admin context).
 * 2. Create a new authenticated user and login as that user.
 * 3. User creates a story and a single page for that story.
 * 4. Switch back to system admin session.
 * 5. Admin fetches the detail of the story page with GET
 *    /storyfieldAi/systemAdmin/stories/{storyId}/pages/{pageId}.
 * 6. Ensure all expected fields and compliance/audit fields (like deleted_at)
 *    are present.
 * 7. Confirm content fields match those originally created.
 * 8. Attempt to retrieve a non-existent pageId and verify error handling.
 * 9. Optionally: Soft delete the story page (if possible; skip if no API
 *    exists), then attempt to get it again as admin, ensuring admin can
 *    still see audit/deleted fields or correct error response.
 */
export async function test_api_story_page_detail_admin_privilege_and_compliance(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const admin_email = RandomGenerator.alphabets(10) + "@company.com";
  const admin_external_id = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: admin_email,
      external_admin_id: admin_external_id,
      actor_type: "systemAdmin",
    },
  });
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: admin_email,
      external_admin_id: admin_external_id,
    },
  });

  // 2. Register and login as an authenticated user
  const user_email = RandomGenerator.alphabets(10) + "@demo.test";
  const user_external_id = RandomGenerator.alphaNumeric(14);
  await api.functional.auth.authenticatedUser.join(connection, {
    body: {
      email: user_email,
      external_user_id: user_external_id,
      actor_type: "authenticatedUser",
    },
  });
  await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      email: user_email,
      external_user_id: user_external_id,
    },
  });

  // 3. User creates a story
  const storyTitle = RandomGenerator.paragraph({ sentences: 3 });
  const storyMainPlot = RandomGenerator.paragraph({ sentences: 5 });
  const storyLanguage = "ko-KR";
  const story =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      {
        body: {
          title: storyTitle,
          main_plot: storyMainPlot,
          language: storyLanguage,
        },
      },
    );
  typia.assert(story);

  // 4. User creates a story page
  const page =
    await api.functional.storyfieldAi.authenticatedUser.stories.pages.create(
      connection,
      {
        storyId: story.id,
        body: {
          page_number: 1,
          text: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
        },
      },
    );
  typia.assert(page);

  // 5. Switch back to system admin session
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: admin_email,
      external_admin_id: admin_external_id,
    },
  });

  // 6. Admin fetches the story page detail
  const pageRead =
    await api.functional.storyfieldAi.systemAdmin.stories.pages.at(connection, {
      storyId: story.id,
      pageId: page.id,
    });
  typia.assert(pageRead);
  TestValidator.equals(
    "page fields: id, storyfield_ai_story_id, page_number, text",
    pageRead.id,
    page.id,
  );
  TestValidator.equals(
    "story-page parent matches",
    pageRead.storyfield_ai_story_id,
    story.id,
  );
  TestValidator.equals(
    "page_number matches",
    pageRead.page_number,
    page.page_number,
  );
  TestValidator.equals("text matches", pageRead.text, page.text);
  TestValidator.equals(
    "created_at is present",
    typeof pageRead.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at is present",
    typeof pageRead.updated_at,
    "string",
  );
  // deleted_at is nullable/optional; default should be absent/null
  TestValidator.equals(
    "deleted_at should be null or undefined",
    pageRead.deleted_at ?? null,
    null,
  );

  // 7. Try fetching a non-existent page (random uuid)
  await TestValidator.error(
    "admin: non-existent pageId returns error",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.stories.pages.at(
        connection,
        {
          storyId: story.id,
          pageId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  await TestValidator.error(
    "admin: non-existent storyId returns error",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.stories.pages.at(
        connection,
        {
          storyId: typia.random<string & tags.Format<"uuid">>(),
          pageId: page.id,
        },
      );
    },
  );

  // Optionally: Soft delete logic could go here if supported
  // If an API for deleting story pages existed, we would soft delete then attempt read as admin again
  // (No such endpoint in current materials.)
}
