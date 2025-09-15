import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiStory";
import type { IStoryfieldAiAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiAuthenticatedUser";
import type { IStoryfieldAiStory } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiStory";

/**
 * Validate indexed story retrieval, filtering, and pagination for authenticated
 * user.
 *
 * 1. Register a new user (generate unique external_user_id/email;
 *    actor_type=authenticatedUser).
 * 2. Login using the registered user.
 * 3. (No story-creation endpoint present) Expect 0 stories in index.
 * 4. List (no filter): expect success, empty data, valid pagination.
 * 5. List with various filter/pagination params: expect empty data, correct
 *    metadata.
 * 6. List with unauthorized context: expect error.
 */
export async function test_api_story_index_retrieve_with_filter_and_pagination(
  connection: api.IConnection,
) {
  // Step 1: Register new authenticatedUser with unique details
  const userCreate = {
    external_user_id: RandomGenerator.alphaNumeric(16),
    email: `${RandomGenerator.alphaNumeric(8)}@autobe-test.com`,
    actor_type: "authenticatedUser",
  } satisfies IStoryfieldAiAuthenticatedUser.ICreate;
  const user = await api.functional.auth.authenticatedUser.join(connection, {
    body: userCreate,
  });
  typia.assert(user);

  // Step 2: Login as user
  const loginResponse = await api.functional.auth.authenticatedUser.login(
    connection,
    {
      body: {
        external_user_id: userCreate.external_user_id,
        email: userCreate.email,
      } satisfies IStoryfieldAiAuthenticatedUser.ILogin,
    },
  );
  typia.assert(loginResponse);
  TestValidator.equals(
    "Login/registration user id should match",
    loginResponse.id,
    user.id,
  );

  // Step 3: Attempt to list stories as freshly registered user (no stories should exist)
  const indexInput = {
    page: 1,
    limit: 10,
  } satisfies IStoryfieldAiStory.IRequest;
  const pageResult =
    await api.functional.storyfieldAi.authenticatedUser.stories.index(
      connection,
      {
        body: indexInput,
      },
    );
  typia.assert(pageResult);
  TestValidator.equals("No stories for new user", pageResult.data.length, 0);

  // Step 4: List with partial title filter (should not break, still empty)
  const titleFilterReq = {
    page: 1,
    limit: 10,
    title: "some random substring",
  } satisfies IStoryfieldAiStory.IRequest;
  const titleFiltered =
    await api.functional.storyfieldAi.authenticatedUser.stories.index(
      connection,
      { body: titleFilterReq },
    );
  typia.assert(titleFiltered);
  TestValidator.equals(
    "Title filter returns no stories on fresh user",
    titleFiltered.data.length,
    0,
  );

  // Step 5: Filtering by language (still should be empty)
  const languageFilterReq = {
    page: 1,
    limit: 10,
    language: "kr-KO",
  } satisfies IStoryfieldAiStory.IRequest;
  const languageFiltered =
    await api.functional.storyfieldAi.authenticatedUser.stories.index(
      connection,
      { body: languageFilterReq },
    );
  typia.assert(languageFiltered);
  TestValidator.equals(
    "Language filter returns no stories on fresh user",
    languageFiltered.data.length,
    0,
  );

  // Step 6: Filtering by date range
  const now = new Date();
  const dateRangeReq = {
    page: 1,
    limit: 10,
    created_at_from: new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 7,
    ).toISOString(),
    created_at_to: now.toISOString(),
  } satisfies IStoryfieldAiStory.IRequest;
  const dateFiltered =
    await api.functional.storyfieldAi.authenticatedUser.stories.index(
      connection,
      { body: dateRangeReq },
    );
  typia.assert(dateFiltered);
  TestValidator.equals(
    "Date range filter returns no stories on fresh user",
    dateFiltered.data.length,
    0,
  );

  // Step 7: Pagination boundary (still empty, page metadata should be sensible)
  const pageBoundaryReq = {
    page: 2,
    limit: 10,
  } satisfies IStoryfieldAiStory.IRequest;
  const pagedResult =
    await api.functional.storyfieldAi.authenticatedUser.stories.index(
      connection,
      { body: pageBoundaryReq },
    );
  typia.assert(pagedResult);
  TestValidator.equals(
    "Empty data for page 2 with no stories",
    pagedResult.data.length,
    0,
  );
  TestValidator.equals(
    "Pagination current page is 2",
    pagedResult.pagination.current,
    2,
  );

  // Step 8: Unauthorized access (simulate unauthenticated call)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "story index should fail without auth",
    async () => {
      await api.functional.storyfieldAi.authenticatedUser.stories.index(
        unauthConn,
        { body: indexInput },
      );
    },
  );
}
