import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import type { IStoryfieldAiStoryPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryPage";

/**
 * Test story page creation and business validation.
 *
 * 1. Register and login a user (UserA)
 * 2. UserA creates a story
 * 3. UserA creates a valid page for their story. Verify association (story_id
 *    match), page_number/text correct, and audit fields are present.
 * 4. Attempt to add page to non-existent story; expect error.
 * 5. Register/login a second user (UserB), create a story with UserB. Switch back
 *    to UserA and try to add page to UserB's story—expect error.
 * 6. Duplicate page_number for same story: expect error.
 */
export async function test_api_story_page_creation_and_validation(
  connection: api.IConnection,
) {
  // UserA registration and login
  const userA_external_id = RandomGenerator.alphaNumeric(16);
  const userA_email = `${RandomGenerator.name(1)}${RandomGenerator.alphaNumeric(2)}@test.com`;
  await api.functional.auth.authenticatedUser.join(connection, {
    body: {
      external_user_id: userA_external_id,
      email: userA_email,
      actor_type: "authenticatedUser",
    } satisfies IStoryfieldAiAuthenticatedUser.ICreate,
  });
  await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: userA_external_id,
      email: userA_email,
    } satisfies IStoryfieldAiAuthenticatedUser.ILogin,
  });

  // UserA creates a story
  const story =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          language: RandomGenerator.pick(["ko-KR", "en", "ja", "zh"] as const),
          main_plot: RandomGenerator.paragraph(),
        } satisfies IStoryfieldAiStory.ICreate,
      },
    );
  typia.assert(story);

  // 1. UserA adds a valid story page
  const page_number = 1; // start with first page
  const page_text = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 8,
  });
  const page =
    await api.functional.storyfieldAi.authenticatedUser.stories.pages.create(
      connection,
      {
        storyId: story.id,
        body: {
          page_number,
          text: page_text,
        } satisfies IStoryfieldAiStoryPage.ICreate,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "page is associated with the correct story",
    page.storyfield_ai_story_id,
    story.id,
  );
  TestValidator.equals("page_number is correct", page.page_number, page_number);
  TestValidator.equals("text is correct", page.text, page_text);
  TestValidator.predicate(
    "created_at is ISO 8601",
    typeof page.created_at === "string" && /T.*Z$/.test(page.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601",
    typeof page.updated_at === "string" && /T.*Z$/.test(page.updated_at),
  );
  TestValidator.equals(
    "deleted_at should be null or undefined",
    page.deleted_at,
    null,
  );

  // 2. Attempt to add page to non-existent story
  await TestValidator.error(
    "cannot add page to non-existent story",
    async () => {
      await api.functional.storyfieldAi.authenticatedUser.stories.pages.create(
        connection,
        {
          storyId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page_number: 2,
            text: RandomGenerator.content(),
          } satisfies IStoryfieldAiStoryPage.ICreate,
        },
      );
    },
  );

  // 3. Create UserB and corresponding story
  const userB_external_id = RandomGenerator.alphaNumeric(16);
  const userB_email = `${RandomGenerator.name(1)}${RandomGenerator.alphaNumeric(2)}@test.com`;
  await api.functional.auth.authenticatedUser.join(connection, {
    body: {
      external_user_id: userB_external_id,
      email: userB_email,
      actor_type: "authenticatedUser",
    } satisfies IStoryfieldAiAuthenticatedUser.ICreate,
  });
  await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: userB_external_id,
      email: userB_email,
    } satisfies IStoryfieldAiAuthenticatedUser.ILogin,
  });
  const storyB =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          language: RandomGenerator.pick(["ko-KR", "en", "ja", "zh"] as const),
          main_plot: RandomGenerator.paragraph(),
        } satisfies IStoryfieldAiStory.ICreate,
      },
    );
  typia.assert(storyB);

  // Switch back to UserA
  await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: userA_external_id,
      email: userA_email,
    } satisfies IStoryfieldAiAuthenticatedUser.ILogin,
  });

  // Try to add page to UserB's story
  await TestValidator.error(
    "cannot add page to a story owned by another user",
    async () => {
      await api.functional.storyfieldAi.authenticatedUser.stories.pages.create(
        connection,
        {
          storyId: storyB.id,
          body: {
            page_number: 1,
            text: RandomGenerator.content({ paragraphs: 1 }),
          } satisfies IStoryfieldAiStoryPage.ICreate,
        },
      );
    },
  );

  // 4. Duplicate page_number for the same story
  await TestValidator.error(
    "cannot add page with duplicate page_number to same story",
    async () => {
      await api.functional.storyfieldAi.authenticatedUser.stories.pages.create(
        connection,
        {
          storyId: story.id,
          body: {
            page_number, // already used for existing page
            text: RandomGenerator.content({ paragraphs: 1 }),
          } satisfies IStoryfieldAiStoryPage.ICreate,
        },
      );
    },
  );
}
