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
 * Validates that a system administrator can create a new page for an
 * existing AI-generated story, including required authentication and edge
 * case handling for duplicate page numbers.
 *
 * 1. Register as an authenticated user (to own the initial story).
 * 2. Log in as the authenticated user.
 * 3. Create a new story as that user (using IStoryfieldAiStory.ICreate).
 * 4. Register as a system administrator (using
 *    IStoryfieldAiSystemAdmin.IJoin).
 * 5. Log in as the system administrator.
 * 6. Add a new page to the story with a valid page number and content (using
 *    IStoryfieldAiStoryPage.ICreate).
 * 7. Validate the response: page is created, correct story ID, page number
 *    matches, text content matches, audit fields (created_at, updated_at)
 *    exist.
 * 8. Edge case: attempt to add a page with the same page number to the same
 *    story and expect a business error (prevent duplicate pages).
 */
export async function test_api_story_page_creation_system_admin_success(
  connection: api.IConnection,
) {
  // 1. Register & log in as authenticated user
  const userExternalId = RandomGenerator.alphaNumeric(12);
  const userEmail = `${RandomGenerator.alphabets(6)}@storyfield.com`;
  await api.functional.auth.authenticatedUser.join(connection, {
    body: {
      external_user_id: userExternalId,
      email: userEmail,
      actor_type: "authenticatedUser",
    },
  });
  await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: userExternalId,
      email: userEmail,
    },
  });

  // 2. Create a new story as this user
  const storyCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    main_plot: RandomGenerator.paragraph({ sentences: 2 }),
    language: "ko-KR",
  } satisfies IStoryfieldAiStory.ICreate;
  const story =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      {
        body: storyCreateBody,
      },
    );
  typia.assert(story);

  // 3. Register as and log in as system administrator
  const adminExternalId = RandomGenerator.alphaNumeric(14);
  const adminEmail = `${RandomGenerator.alphabets(8)}@admin.storyfield.com`;
  await api.functional.auth.systemAdmin.join(connection, {
    body: {
      external_admin_id: adminExternalId,
      email: adminEmail,
      actor_type: "systemAdmin",
    },
  });
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: adminExternalId,
      email: adminEmail,
    },
  });

  // 4. Create a page for the story (system admin context)
  const newPageBody = {
    page_number: 1,
    text: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 6,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies IStoryfieldAiStoryPage.ICreate;
  const newPage =
    await api.functional.storyfieldAi.systemAdmin.stories.pages.create(
      connection,
      {
        storyId: story.id,
        body: newPageBody,
      },
    );
  typia.assert(newPage);
  TestValidator.equals(
    "story id on created page matches",
    newPage.storyfield_ai_story_id,
    story.id,
  );
  TestValidator.equals(
    "page number matches",
    newPage.page_number,
    newPageBody.page_number,
  );
  TestValidator.equals("text matches", newPage.text, newPageBody.text);
  TestValidator.predicate(
    "created_at field is ISO string",
    typeof newPage.created_at === "string" && newPage.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at field is ISO string",
    typeof newPage.updated_at === "string" && newPage.updated_at.length > 0,
  );

  // 5. Edge case: attempt to add a duplicate page number
  await TestValidator.error(
    "should not allow duplicate page_number for same story",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.stories.pages.create(
        connection,
        {
          storyId: story.id,
          body: newPageBody,
        },
      );
    },
  );
}
