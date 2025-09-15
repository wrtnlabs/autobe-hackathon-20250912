import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";
import type { IEnterpriseLmsForum } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForum";
import type { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";

/**
 * E2E test for updating a forum thread as an authenticated external learner
 * guest user.
 *
 * This test covers the full lifecycle of external learner guest forum thread
 * update including:
 *
 * 1. External learner guest registration and authentication.
 * 2. Forum existence validation.
 * 3. Forum thread creation for the external learner guest.
 * 4. Forum thread update with new title and body content.
 * 5. Response validation and business logic checks.
 * 6. Negative test cases for invalid forum and thread IDs and unauthorized update
 *    attempts.
 */
export async function test_api_externallearner_forum_thread_update_with_authorization(
  connection: api.IConnection,
) {
  // 1. External learner guest registration and authentication
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `${RandomGenerator.alphaNumeric(5)}@example.com`;
  const passwordHash = RandomGenerator.alphaNumeric(64); // simulate a hashed password
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);
  const status = "active";

  const externalLearner: IEnterpriseLmsExternalLearner.IAuthorized =
    await api.functional.auth.externalLearner.join.joinExternalLearner(
      connection,
      {
        body: {
          tenant_id: tenantId,
          email: email,
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          status: status,
        } satisfies IEnterpriseLmsExternalLearner.IJoin,
      },
    );
  typia.assert(externalLearner);

  // 2. Retrieve or confirm forum existence for this tenant
  // For test, pick or create a realistic forum to use
  const forum: IEnterpriseLmsForum =
    await api.functional.enterpriseLms.forums.at(connection, {
      forumId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(forum);
  TestValidator.equals(
    "forum belongs to tenant",
    forum.tenant_id,
    externalLearner.tenant_id,
  );

  // 3. Create a forum thread for external learner in the forum
  const createBody = {
    forum_id: forum.id,
    author_id: externalLearner.id,
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 4, wordMax: 10 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEnterpriseLmsForumThread.ICreate;

  const createdThread: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.externalLearner.forums.forumThreads.create(
      connection,
      { forumId: forum.id, body: createBody },
    );
  typia.assert(createdThread);

  TestValidator.equals(
    "createdThread forumId matches",
    createdThread.forum_id,
    forum.id,
  );
  TestValidator.equals(
    "createdThread authorId matches",
    createdThread.author_id,
    externalLearner.id,
  );

  // 4. Update the forum thread with new title and body
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 4, wordMax: 10 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
  } satisfies IEnterpriseLmsForumThread.IUpdate;

  const updatedThread: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.externalLearner.forums.forumThreads.update(
      connection,
      { forumId: forum.id, forumThreadId: createdThread.id, body: updateBody },
    );
  typia.assert(updatedThread);

  TestValidator.equals(
    "updatedThread forumId matches",
    updatedThread.forum_id,
    forum.id,
  );
  TestValidator.equals(
    "updatedThread authorId matches",
    updatedThread.author_id,
    externalLearner.id,
  );
  TestValidator.notEquals(
    "updatedThread title changed",
    updatedThread.title,
    createdThread.title,
  );
  TestValidator.notEquals(
    "updatedThread body changed",
    updatedThread.body,
    createdThread.body,
  );

  // 5. Negative test: update with invalid forumId
  await TestValidator.error(
    "update with invalid forumId should fail",
    async () => {
      await api.functional.enterpriseLms.externalLearner.forums.forumThreads.update(
        connection,
        {
          forumId: typia.random<string & tags.Format<"uuid">>(),
          forumThreadId: createdThread.id,
          body: updateBody,
        },
      );
    },
  );

  // 6. Negative test: update with invalid forumThreadId
  await TestValidator.error(
    "update with invalid forumThreadId should fail",
    async () => {
      await api.functional.enterpriseLms.externalLearner.forums.forumThreads.update(
        connection,
        {
          forumId: forum.id,
          forumThreadId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );

  // 7. Negative test: update without authorization
  // Create a connection without Authorization header to simulate unauthenticated
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "update without authorization should fail",
    async () => {
      await api.functional.enterpriseLms.externalLearner.forums.forumThreads.update(
        unauthConn,
        {
          forumId: forum.id,
          forumThreadId: createdThread.id,
          body: updateBody,
        },
      );
    },
  );
}
