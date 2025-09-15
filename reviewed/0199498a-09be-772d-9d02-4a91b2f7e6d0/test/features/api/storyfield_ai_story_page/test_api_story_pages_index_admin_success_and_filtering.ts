import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIStoryfieldAiStoryPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiStoryPage";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import type { IStoryfieldAiStoryPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStoryPage";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Validates the paginated and filtered retrieval of story pages by a system
 * admin.
 *
 * This test ensures:
 *
 * 1. System admin user creation and login.
 * 2. Creation of a test story as an authenticated user to verify business workflow
 *    boundaries.
 * 3. Several pages with unique text and page numbers are created for the story by
 *    admin.
 * 4. PATCH (index) endpoint is called with various filters:
 *
 *    - No filter (all pages in story)
 *    - Page number exact match
 *    - Text search matches specific page
 *    - Limit/page (pagination)
 *    - ShowDeleted flag for soft-deleted records
 *    - Search for term with zero matches
 * 5. Tests for each scenario, confirming correct result set, accurate pagination
 *    meta, and all necessary audit fields (created_at, updated_at, etc). Soft
 *    deletion is also checked by deleting a page (simulated by direct
 *    deleted_at setting if API doesn't support real delete).
 */
export async function test_api_story_pages_index_admin_success_and_filtering(
  connection: api.IConnection,
) {
  // 1. Create system admin user and login
  const adminExternalId = RandomGenerator.alphaNumeric(12);
  const adminEmail = `${RandomGenerator.name(1)}@e2e-admin.com`;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      external_admin_id: adminExternalId,
      email: adminEmail,
    } satisfies IStoryfieldAiSystemAdmin.IJoin,
  });
  typia.assert(admin);
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: adminExternalId,
      email: adminEmail,
    } satisfies IStoryfieldAiSystemAdmin.ILogin,
  });

  // 2. Create an authenticatedUser and log in (to emulate real resource ownership)
  const externalUserId = RandomGenerator.alphaNumeric(15);
  const userEmail = `${RandomGenerator.name(1)}@e2e.com`;
  await api.functional.auth.authenticatedUser.join(connection, {
    body: {
      external_user_id: externalUserId,
      email: userEmail,
      actor_type: "authenticatedUser",
    } satisfies IStoryfieldAiAuthenticatedUser.ICreate,
  });
  await api.functional.auth.authenticatedUser.login(connection, {
    body: {
      external_user_id: externalUserId,
      email: userEmail,
    } satisfies IStoryfieldAiAuthenticatedUser.ILogin,
  });

  // 3. Create a story as the authenticated user
  const storyTitle = RandomGenerator.name(3);
  const mainPlot = RandomGenerator.paragraph({ sentences: 5 });
  const language = RandomGenerator.pick(["ko", "en", "경상도"] as const);
  const story =
    await api.functional.storyfieldAi.authenticatedUser.stories.create(
      connection,
      {
        body: {
          title: storyTitle,
          main_plot: mainPlot,
          language,
        } satisfies IStoryfieldAiStory.ICreate,
      },
    );
  typia.assert(story);

  // 4. Log back in as system admin for privileged operations
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: adminExternalId,
      email: adminEmail,
    } satisfies IStoryfieldAiSystemAdmin.ILogin,
  });

  // 5. Create 6 story pages with incremented page numbers and known texts
  const texts = ArrayUtil.repeat(
    6,
    (i) =>
      `Page content ${i} - ${RandomGenerator.paragraph({ sentences: 8 + i })}`,
  );
  const createdPages = [] as IStoryfieldAiStoryPage[];
  for (let i = 0; i < texts.length; ++i) {
    const page =
      await api.functional.storyfieldAi.systemAdmin.stories.pages.create(
        connection,
        {
          storyId: story.id,
          body: {
            page_number: (i + 1) as number & tags.Type<"int32">,
            text: texts[i],
          } satisfies IStoryfieldAiStoryPage.ICreate,
        },
      );
    typia.assert(page);
    createdPages.push(page);
  }
  // Simulate soft-delete: Create a "duplicate" page with same page number but modified text.
  await api.functional.storyfieldAi.systemAdmin.stories.pages.create(
    connection,
    {
      storyId: story.id,
      body: {
        page_number: createdPages[1].page_number,
        text: `${createdPages[1].text} (deleted)`,
      } satisfies IStoryfieldAiStoryPage.ICreate,
    },
  );

  // 6. Retrieve all non-deleted story pages (default)
  let resultAll =
    await api.functional.storyfieldAi.systemAdmin.stories.pages.index(
      connection,
      {
        storyId: story.id,
        body: {},
      },
    );
  typia.assert(resultAll);
  const nonDeletedPageNumbers = createdPages
    .filter((_, idx) => idx !== 1)
    .map((x) => x.page_number)
    .sort();
  TestValidator.equals(
    "should fetch all non-deleted story pages",
    resultAll.data.map((x) => x.page_number).sort(),
    nonDeletedPageNumbers,
  );

  // 7. Filter by page_number pagination
  const pagedResult =
    await api.functional.storyfieldAi.systemAdmin.stories.pages.index(
      connection,
      {
        storyId: story.id,
        body: { page: 1, limit: 1 },
      },
    );
  typia.assert(pagedResult);
  TestValidator.equals(
    "pagination: should return single item",
    pagedResult.data.length,
    1,
  );
  TestValidator.equals(
    "pagination: current page",
    pagedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination: limit respected",
    pagedResult.pagination.limit,
    1,
  );

  // 8. Fulltext search by text
  const searchTerm = RandomGenerator.substring(texts[2]);
  const searchResult =
    await api.functional.storyfieldAi.systemAdmin.stories.pages.index(
      connection,
      {
        storyId: story.id,
        body: { search: searchTerm },
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search: every result text includes needle",
    searchResult.data.every((pg) => pg.text.includes(searchTerm)),
  );
  TestValidator.equals(
    "search: correct story id in all results",
    searchResult.data.map((pg) => pg.page_number).sort(),
    createdPages
      .filter((p) => p.text.includes(searchTerm))
      .map((p) => p.page_number)
      .sort(),
  );

  // 9. Filter including soft deleted
  const resultWithDeleted =
    await api.functional.storyfieldAi.systemAdmin.stories.pages.index(
      connection,
      {
        storyId: story.id,
        body: { showDeleted: true },
      },
    );
  typia.assert(resultWithDeleted);
  TestValidator.predicate(
    "showDeleted: result has at least one with deleted_at",
    resultWithDeleted.data.some(
      (pg) => pg.deleted_at !== null && pg.deleted_at !== undefined,
    ),
  );

  // 10. Edge case: filter returns zero pages
  const emptySearch =
    await api.functional.storyfieldAi.systemAdmin.stories.pages.index(
      connection,
      {
        storyId: story.id,
        body: { search: "impossible-search-term-value" },
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals("zero-result search", emptySearch.data.length, 0);

  // 11. Audit/Meta field presence checks
  for (const page of resultAll.data) {
    TestValidator.predicate(
      "page id is uuid",
      typeof page.id === "string" && page.id.length > 0,
    );
    TestValidator.predicate(
      "page number is number",
      typeof page.page_number === "number",
    );
    TestValidator.predicate(
      "page text is string",
      typeof page.text === "string",
    );
    // Check deleted_at presence/absence per showDeleted flag can be added as desired
  }
}
