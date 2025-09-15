import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsForum } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForum";
import type { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";

/**
 * Test scenario verifying that an authenticated corporate learner can create a
 * forum thread within a specified forum. The test covers:
 *
 * 1. Corporate learner user creation and authentication.
 * 2. Forum retrieval to validate the existence of the forum identified by forumId.
 * 3. Forum thread creation with valid data linked to authenticated user and forum.
 * 4. Asserting the returned thread's essential properties including UUID format
 *    and field matching.
 * 5. Negative tests ensuring errors are properly raised when using invalid forumId
 *    or unauthorized access.
 *
 * All API calls strictly await responses, and typings are verified with
 * typia.assert. TestValidator assertions include descriptive messages.
 */
export async function test_api_corporatelearner_forum_thread_creation_with_authentication(
  connection: api.IConnection,
) {
  // 1. Join as corporate learner for authentication
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const corporateLearner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: {
        tenant_id: tenantId,
        email: `${RandomGenerator.name(1).toLowerCase()}@example.com`,
        password: "Password123!",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsCorporateLearner.ICreate,
    });
  typia.assert(corporateLearner);

  // 2. Retrieve an existing forum to get a valid forumId
  const forum: IEnterpriseLmsForum =
    await api.functional.enterpriseLms.forums.at(connection, {
      forumId: typia.assert<string & tags.Format<"uuid">>(
        corporateLearner.tenant_id,
      ),
    });
  typia.assert(forum);
  TestValidator.predicate(
    "Retrieved forum valid",
    typeof forum.id === "string" && forum.id.length > 0,
  );

  // 3. Create forum thread with valid data
  const threadCreateBody = {
    forum_id: forum.id,
    author_id: corporateLearner.id,
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IEnterpriseLmsForumThread.ICreate;

  const forumThread: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.create(
      connection,
      {
        forumId: forum.id,
        body: threadCreateBody,
      },
    );
  typia.assert(forumThread);
  TestValidator.equals(
    "Forum ID matches on created thread",
    forumThread.forum_id,
    forum.id,
  );
  TestValidator.equals(
    "Author ID matches on created thread",
    forumThread.author_id,
    corporateLearner.id,
  );
  TestValidator.predicate(
    "Created thread ID is valid UUID",
    typeof forumThread.id === "string" &&
      /^[0-9a-fA-F-]{36}$/.test(forumThread.id),
  );
  TestValidator.predicate(
    "Created thread has title",
    typeof forumThread.title === "string" && forumThread.title.length > 0,
  );

  // 4. Test error case: create thread with non-existent forumId
  await TestValidator.error(
    "Creating thread with invalid forumId should fail",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.create(
        connection,
        {
          forumId: typia.random<string & tags.Format<"uuid">>(), // random UUID not existing
          body: {
            forum_id: typia.random<string & tags.Format<"uuid">>(),
            author_id: corporateLearner.id,
            title: "Test thread invalid forum",
          } satisfies IEnterpriseLmsForumThread.ICreate,
        },
      );
    },
  );

  // 5. Test error case: unauthorized access - simulate invalid token scenario
  // For that, we create a new connection without authorization token
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "Unauthorized thread creation should be rejected",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.create(
        unauthenticatedConnection,
        {
          forumId: forum.id,
          body: threadCreateBody,
        },
      );
    },
  );
}
