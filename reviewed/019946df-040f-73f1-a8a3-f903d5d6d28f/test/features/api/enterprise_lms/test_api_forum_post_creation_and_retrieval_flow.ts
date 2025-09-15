import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumPost";

/**
 * E2E Test for authenticated corporate learner forum post retrieval
 * workflow.
 *
 * 1. Register a new corporate learner user with tenant, email, and password.
 * 2. Login with the created user's credentials.
 * 3. Retrieve a forum post within forum and thread hierarchy.
 * 4. Confirm correctness of retrieved forum post data.
 * 5. Test rejection of retrieval with invalid IDs (negative cases).
 *
 * This test ensures multi-tenant authorization, ownership, and data
 * integrity for forum post retrieval in the LMS system.
 */
export async function test_api_forum_post_creation_and_retrieval_flow(
  connection: api.IConnection,
) {
  // Step 1 - Prepare test user data
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `${RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase()}@company.com`;
  const password = "StrongPassword123!";
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);

  // Step 2 - Register corporate learner (join)
  const authorizedUser: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: {
        tenant_id: tenantId,
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      } satisfies IEnterpriseLmsCorporateLearner.ICreate,
    });
  typia.assert(authorizedUser);

  // Step 3 - Authenticate corporate learner (login)
  const loggedInUser: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: {
        email,
        password,
      } satisfies IEnterpriseLmsCorporateLearner.ILogin,
    });
  typia.assert(loggedInUser);

  // Step 4 - Specify forum post resource identifiers
  // Using random valid UUIDs for IDs
  const forumId = typia.random<string & tags.Format<"uuid">>();
  const forumThreadId = typia.random<string & tags.Format<"uuid">>();
  const forumPostId = typia.random<string & tags.Format<"uuid">>();

  // Step 5 - Retrieve forum post with correct IDs
  const forumPost: IEnterpriseLmsForumPost =
    await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.forumPosts.at(
      connection,
      {
        forumId,
        forumThreadId,
        forumPostId,
      },
    );
  typia.assert(forumPost);

  // Step 6 - Validate key properties of forum post
  TestValidator.predicate(
    "forum post ID format validation",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      forumPost.id,
    ),
  );
  TestValidator.equals(
    "forum post thread ID",
    forumPost.thread_id,
    forumThreadId,
  );
  TestValidator.predicate(
    "forum post author ID format validation",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      forumPost.author_id,
    ),
  );
  TestValidator.predicate(
    "forum post body non-empty",
    forumPost.body.length > 0,
  );

  // Validate ISO date strings
  TestValidator.predicate(
    "forum post created_at format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]+)?Z$/.test(
      forumPost.created_at,
    ),
  );
  TestValidator.predicate(
    "forum post updated_at format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]+)?Z$/.test(
      forumPost.updated_at,
    ),
  );

  // Step 7 - Negative test cases: retrieval with invalid IDs should fail
  await TestValidator.error(
    "retrieving forum post with invalid forumId should fail",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.forumPosts.at(
        connection,
        {
          forumId: "invalid-uuid-string",
          forumThreadId,
          forumPostId,
        },
      );
    },
  );

  await TestValidator.error(
    "retrieving forum post with invalid forumThreadId should fail",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.forumPosts.at(
        connection,
        {
          forumId,
          forumThreadId: "invalid-uuid-string",
          forumPostId,
        },
      );
    },
  );

  await TestValidator.error(
    "retrieving forum post with invalid forumPostId should fail",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.forumPosts.at(
        connection,
        {
          forumId,
          forumThreadId,
          forumPostId: "invalid-uuid-string",
        },
      );
    },
  );
}
