import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumPost";

/**
 * Validate the basic flow of forum post creation by a corporate learner.
 *
 * This test covers the entire flow from the corporate learner's
 * registration (join), login for authentication, and the actual forum post
 * creation within a specified forum and thread. It asserts correct linkage
 * between post, author, and thread, and performs negative tests with
 * missing fields, unauthorized access, and invalid tenant context to
 * confirm proper error handling and tenant enforcement.
 *
 * Test steps:
 *
 * 1. Register a corporate learner with valid tenant ID, email, password, first
 *    and last names.
 * 2. Authenticate the corporate learner via login to obtain authorization
 *    token.
 * 3. Generate random UUIDs for forumId and forumThreadId.
 * 4. Create a forum post with the required body (thread_id matching
 *    forumThreadId, author_id as the learner id, and a non-empty body
 *    string).
 * 5. Validate the properties of the created forum post including IDs and
 *    timestamps.
 * 6. Attempt to create a post with missing required body property to assert
 *    failure.
 * 7. Attempt to create a post with unauthenticated connection (empty headers)
 *    to assert failure.
 * 8. Attempt to create a post using token from different tenant context to
 *    assert multi-tenant enforcement.
 */
export async function test_api_forum_post_creation_basic_flow(
  connection: api.IConnection,
) {
  // Step 1: Register a new corporate learner account
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `${RandomGenerator.alphabets(6)}@example.com`;
  const password = "TestPassword123!";
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);

  const corporateLearner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: {
        tenant_id: tenantId,
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      } satisfies IEnterpriseLmsCorporateLearner.ICreate,
    });
  typia.assert(corporateLearner);

  // Step 2: Login to obtain authorization
  const loginResult: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: {
        email,
        password,
      } satisfies IEnterpriseLmsCorporateLearner.ILogin,
    });
  typia.assert(loginResult);

  // Step 3: Prepare valid forumId and forumThreadId
  const forumId = typia.random<string & tags.Format<"uuid">>();
  const forumThreadId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Create a new forum post with correct details
  const forumPostBody = {
    thread_id: forumThreadId,
    author_id: corporateLearner.id,
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IEnterpriseLmsForumPost.ICreate;

  const createdPost: IEnterpriseLmsForumPost =
    await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.forumPosts.create(
      connection,
      {
        forumId,
        forumThreadId,
        body: forumPostBody,
      },
    );
  typia.assert(createdPost);

  // Validate returned forum post properties
  TestValidator.equals(
    "thread_id matches forumThreadId",
    createdPost.thread_id,
    forumThreadId,
  );
  TestValidator.equals(
    "author_id matches corporate learner id",
    createdPost.author_id,
    corporateLearner.id,
  );
  TestValidator.predicate(
    "forum post body is non-empty",
    createdPost.body.length > 0,
  );

  // Validate IDs and timestamps are present
  TestValidator.predicate(
    "post id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdPost.id,
    ),
  );
  TestValidator.predicate(
    "created_at is ISO datetime",
    !isNaN(Date.parse(createdPost.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO datetime",
    !isNaN(Date.parse(createdPost.updated_at)),
  );

  // Step 5: Attempt to create forum post with missing required 'body' field (should fail)
  await TestValidator.error(
    "missing required body property should fail",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.forumPosts.create(
        connection,
        {
          forumId,
          forumThreadId,
          body: {
            thread_id: forumThreadId,
            author_id: corporateLearner.id,
            // body field missing
          } as any, // TypeScript enforcement - skip with as any just for error scenario
        },
      );
    },
  );

  // Step 6: Attempt to create forum post without authorization
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated create forum post should fail",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.forumPosts.create(
        unauthenticatedConnection,
        {
          forumId,
          forumThreadId,
          body: forumPostBody,
        },
      );
    },
  );

  // Step 7: Attempt to create forum post with a corporate learner from a different tenant
  // Register a different tenant
  const otherTenantId = typia.random<string & tags.Format<"uuid">>();
  const otherEmail = `${RandomGenerator.alphabets(6)}@example.com`;
  const otherPassword = "OtherPass123!";
  const otherFirstName = RandomGenerator.name(1);
  const otherLastName = RandomGenerator.name(1);

  // Join different tenant corporate learner and login to switch authorization
  const otherLearner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: {
        tenant_id: otherTenantId,
        email: otherEmail,
        password: otherPassword,
        first_name: otherFirstName,
        last_name: otherLastName,
      } satisfies IEnterpriseLmsCorporateLearner.ICreate,
    });
  typia.assert(otherLearner);

  await api.functional.auth.corporateLearner.login(connection, {
    body: {
      email: otherEmail,
      password: otherPassword,
    } satisfies IEnterpriseLmsCorporateLearner.ILogin,
  });

  // Attempt to create forum post using different tenant authorization (should fail)
  await TestValidator.error(
    "create forum post with different tenant authorization should fail",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.forumPosts.create(
        connection,
        {
          forumId,
          forumThreadId,
          body: forumPostBody,
        },
      );
    },
  );
}
