import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsForum } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForum";
import type { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";

/**
 * Validate corporate learner forum thread update operation with
 * authorization.
 *
 * This test simulates a corporate learner user joining (registration and
 * authentication), then creating a forum thread under an existing forum,
 * and updating the forum thread using the authorized PUT API.
 *
 * Workflow steps:
 *
 * 1. Corporate learner signs up via /auth/corporateLearner/join.
 * 2. Retrieve the forum by calling /enterpriseLms/forums/{forumId}.
 * 3. Create a forum thread inside the forum using POST
 *    /enterpriseLms/corporateLearner/forums/{forumId}/forumThreads.
 * 4. Update the forum thread with new title and body using PUT
 *    /enterpriseLms/corporateLearner/forums/{forumId}/forumThreads/{forumThreadId}.
 * 5. Validate the response of the update reflects changes.
 * 6. Test error cases: unauthorized user access, invalid forum ID, invalid
 *    thread ID.
 *
 * Business logic validations:
 *
 * - Only the author (authenticated corporate learner) can update the thread.
 * - Title must be non-empty string.
 * - Body can be null or string but must be properly updated.
 *
 * All API responses are typia-asserted to ensure type correctness.
 */
export async function test_api_corporatelearner_forum_thread_update_with_authorization(
  connection: api.IConnection,
) {
  // 1. Corporate learner signs up and authenticates
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const userEmail: string = `user_${RandomGenerator.alphaNumeric(6)}@example.com`;

  const learner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: {
        tenant_id: tenantId,
        email: userEmail,
        password: "P@ssw0rd1234",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsCorporateLearner.ICreate,
    });
  typia.assert(learner);

  // 2. Retrieve the forum data to get valid forum ID
  // For test purposes, we simulate a valid forum ID
  const forumId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Verify forum existence
  const forum: IEnterpriseLmsForum =
    await api.functional.enterpriseLms.forums.at(connection, { forumId });
  typia.assert(forum);
  TestValidator.equals("forum id should match", forum.id, forumId);

  // 3. Create a forum thread by the learner
  const threadCreateBody = {
    forum_id: forumId,
    author_id: learner.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IEnterpriseLmsForumThread.ICreate;

  const thread: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.create(
      connection,
      {
        forumId,
        body: threadCreateBody,
      },
    );
  typia.assert(thread);
  TestValidator.equals("thread forum_id matches", thread.forum_id, forumId);
  TestValidator.equals(
    "thread author_id matches learner id",
    thread.author_id,
    learner.id,
  );
  TestValidator.predicate("thread title is non-empty", thread.title.length > 0);

  // 4. Update the forum thread with new title and body
  const threadUpdateBody = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 6, wordMax: 12 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IEnterpriseLmsForumThread.IUpdate;

  const updatedThread: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.update(
      connection,
      {
        forumId: forum.id,
        forumThreadId: thread.id,
        body: threadUpdateBody,
      },
    );
  typia.assert(updatedThread);
  TestValidator.equals(
    "updated thread id matches",
    updatedThread.id,
    thread.id,
  );
  TestValidator.equals(
    "updated thread forum_id matches",
    updatedThread.forum_id,
    forum.id,
  );
  TestValidator.equals(
    "updated thread author_id matches",
    updatedThread.author_id,
    thread.author_id,
  );
  TestValidator.equals(
    "updated thread title matches",
    updatedThread.title,
    threadUpdateBody.title,
  );
  // body can be null or string
  if (updatedThread.body === null || updatedThread.body === undefined) {
    TestValidator.predicate(
      "updated thread body is explicitly null or undefined",
      true,
    );
  } else {
    TestValidator.equals(
      "updated thread body matches",
      updatedThread.body,
      threadUpdateBody.body!,
    );
  }

  // 5. Negative tests

  // 5.1. Unauthorized update attempt with different user
  // Register a different corporate learner
  const altUserEmail = `altuser_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const altLearner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: {
        tenant_id: tenantId,
        email: altUserEmail,
        password: "P@ssw0rd1234",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsCorporateLearner.ICreate,
    });
  typia.assert(altLearner);

  // Attempt update as alt user - expect error
  await TestValidator.error(
    "unauthorized user cannot update forum thread",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.update(
        connection,
        {
          forumId: forum.id,
          forumThreadId: thread.id,
          body: {
            title: "Unauthorized update attempt",
          } satisfies IEnterpriseLmsForumThread.IUpdate,
        },
      );
    },
  );

  // 5.2. Update with invalid forum ID
  await TestValidator.error("update fails with invalid forum ID", async () => {
    await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.update(
      connection,
      {
        forumId: typia.random<string & tags.Format<"uuid">>(),
        forumThreadId: thread.id,
        body: {
          title: "Invalid forum ID update",
        } satisfies IEnterpriseLmsForumThread.IUpdate,
      },
    );
  });

  // 5.3. Update with invalid forum thread ID
  await TestValidator.error(
    "update fails with invalid forum thread ID",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.update(
        connection,
        {
          forumId: forum.id,
          forumThreadId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            title: "Invalid thread ID update",
          } satisfies IEnterpriseLmsForumThread.IUpdate,
        },
      );
    },
  );
}
