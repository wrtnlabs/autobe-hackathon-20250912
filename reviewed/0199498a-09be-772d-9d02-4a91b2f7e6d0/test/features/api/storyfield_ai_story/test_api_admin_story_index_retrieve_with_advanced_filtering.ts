import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiStory";
import type { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Validate system admin story index retrieval, search, and filtering.
 *
 * Scenario:
 *
 * 1. Register new systemAdmin and log in
 * 2. Retrieve paginated story index (no filters)
 * 3. Retrieve story index with title search (first story's title substring)
 * 4. Retrieve story index filtered by language (language of a found story)
 * 5. Retrieve with deleted = false (should exclude deleted stories)
 * 6. Retrieve with deleted = true (should include only deleted stories if any)
 * 7. Attempt retrieval unauthenticated (error expected)
 */
export async function test_api_admin_story_index_retrieve_with_advanced_filtering(
  connection: api.IConnection,
) {
  // 1. Register and login as systemAdmin
  const joinReq = {
    external_admin_id: RandomGenerator.alphaNumeric(12),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinReq,
  });
  typia.assert(admin);
  // Login just to verify login API, and refresh token header
  const adminLogin = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: joinReq.external_admin_id,
      email: joinReq.email,
    },
  });
  typia.assert(adminLogin);

  // 2. Retrieve paginated story index (no filters)
  const page1 = await api.functional.storyfieldAi.systemAdmin.stories.index(
    connection,
    { body: { page: 1, limit: 10 } },
  );
  typia.assert(page1);
  TestValidator.predicate(
    "story index returns at least one story for admin",
    page1.data.length > 0,
  );
  // Remember first story for filter tests
  const found = page1.data[0];

  // 3. Title search (use substring of found title)
  const titleFragment = found.title.slice(
    0,
    Math.max(found.title.length - 1, 1),
  );
  const titleResult =
    await api.functional.storyfieldAi.systemAdmin.stories.index(connection, {
      body: { title: titleFragment },
    });
  typia.assert(titleResult);
  TestValidator.predicate(
    "title filter returns stories with matching substring",
    titleResult.data.every((s) => s.title.includes(titleFragment)),
  );

  // 4. Language filter
  const languageResult =
    await api.functional.storyfieldAi.systemAdmin.stories.index(connection, {
      body: { language: found.language },
    });
  typia.assert(languageResult);
  TestValidator.predicate(
    "language filter only returns stories of specified language",
    languageResult.data.every((s) => s.language === found.language),
  );

  // 5. Only non-deleted stories
  const nonDeleted =
    await api.functional.storyfieldAi.systemAdmin.stories.index(connection, {
      body: { deleted: false },
    });
  typia.assert(nonDeleted);
  TestValidator.predicate(
    "deleted = false returns only non-deleted stories",
    nonDeleted.data.every((s) => !s.deleted_at),
  );

  // 6. Only deleted stories (if any exist)
  const deleted = await api.functional.storyfieldAi.systemAdmin.stories.index(
    connection,
    { body: { deleted: true } },
  );
  typia.assert(deleted);
  TestValidator.predicate(
    "deleted = true returns only soft-deleted stories (or none)",
    deleted.data.every((s) => !!s.deleted_at) || deleted.data.length === 0,
  );

  // 7. Unauthenticated call (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "system admin story list fails when unauthenticated",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.stories.index(unauthConn, {
        body: {},
      });
    },
  );
}
