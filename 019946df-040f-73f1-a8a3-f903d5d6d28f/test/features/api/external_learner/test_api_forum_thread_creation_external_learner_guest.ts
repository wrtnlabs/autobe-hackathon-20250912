import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsExternalLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsExternalLearner";
import type { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";

/**
 * End-to-end test for forum thread creation by an external learner guest
 * user.
 *
 * This test performs the following:
 *
 * 1. Registers an external learner guest with valid tenant ID, email, password
 *    hash, name, and active status.
 * 2. Creates a forum thread inside a valid forum, linking the thread to the
 *    newly created external learner guest user.
 * 3. Validates that the created thread is correctly linked and fields match
 *    input.
 * 4. Tests error conditions including invalid forumId format, missing required
 *    title field, and unauthorized creation attempts.
 *
 * The test ensures business rules and authorization are correctly enforced
 * for external learner guests.
 */
export async function test_api_forum_thread_creation_external_learner_guest(
  connection: api.IConnection,
) {
  // 1. Register external learner guest user
  const joinBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(40),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsExternalLearner.IJoin;

  const externalLearner: IEnterpriseLmsExternalLearner.IAuthorized =
    await api.functional.auth.externalLearner.join.joinExternalLearner(
      connection,
      {
        body: joinBody,
      },
    );
  typia.assert(externalLearner);

  // 2. Create a forum thread using valid forumId and author_id
  const forumId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const createThreadBody = {
    forum_id: forumId,
    author_id: externalLearner.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IEnterpriseLmsForumThread.ICreate;

  const forumThread: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.externalLearner.forums.forumThreads.create(
      connection,
      {
        forumId,
        body: createThreadBody,
      },
    );
  typia.assert(forumThread);

  // Validate created forum thread fields
  TestValidator.equals(
    "forum thread forum_id matches",
    forumThread.forum_id,
    createThreadBody.forum_id,
  );
  TestValidator.equals(
    "forum thread author_id matches",
    forumThread.author_id,
    createThreadBody.author_id,
  );
  TestValidator.equals(
    "forum thread title matches",
    forumThread.title,
    createThreadBody.title,
  );
  TestValidator.equals(
    "forum thread body matches",
    forumThread.body,
    createThreadBody.body ?? null,
  );

  // 3. Test invalid forumId format causes error
  await TestValidator.error(
    "forum thread creation with invalid forumId should fail",
    async () => {
      await api.functional.enterpriseLms.externalLearner.forums.forumThreads.create(
        connection,
        {
          forumId: "invalid-uuid-format", // Invalid format
          body: createThreadBody,
        },
      );
    },
  );

  // 4. Test missing required field 'title' causes error
  const invalidBodyMissingTitle = {
    forum_id: forumId,
    author_id: externalLearner.id,
  } satisfies Partial<IEnterpriseLmsForumThread.ICreate>;

  await TestValidator.error(
    "forum thread creation missing title should fail",
    async () => {
      await api.functional.enterpriseLms.externalLearner.forums.forumThreads.create(
        connection,
        {
          forumId,
          // Incomplete body missing 'title'
          body: invalidBodyMissingTitle as any, // Allowed here for test
        },
      );
    },
  );

  // 5. Test unauthorized creation attempt by using a disconnected connection
  // Create a 'guest' connection without authentication tokens
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthorized forum thread creation should fail",
    async () => {
      await api.functional.enterpriseLms.externalLearner.forums.forumThreads.create(
        unauthenticatedConnection,
        {
          forumId,
          body: createThreadBody,
        },
      );
    },
  );
}
