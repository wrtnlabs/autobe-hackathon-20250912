import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";

/**
 * This test validates the lifecycle of a corporate learner creating a forum
 * thread. It covers user registration, authentication, valid thread creation,
 * and error handling.
 *
 * Steps:
 *
 * 1. Register a corporate learner with a valid tenant ID.
 * 2. Log in as the registered user.
 * 3. Use the authenticated session to create a forum thread in a given forum.
 * 4. Confirm that the returned thread data matches the inputs and user identity.
 * 5. Test API rejects unauthorized attempts, invalid forum IDs, and missing
 *    required fields.
 */
export async function test_api_forum_thread_creation_corporate_learner(
  connection: api.IConnection,
) {
  // Step 1: Register a new corporate learner user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const learnerCreate = {
    tenant_id: tenantId,
    email: `user${Date.now()}@company.com`,
    password: "securePass123",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const authorizedLearner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: learnerCreate,
    });
  typia.assert(authorizedLearner);

  // Step 2: Log in as the registered corporate learner
  const learnerLogin = {
    email: learnerCreate.email,
    password: learnerCreate.password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;
  const loginAuthorized: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: learnerLogin,
    });
  typia.assert(loginAuthorized);

  // Generate a valid forumId (simulate existing forum context)
  const validForumId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create a forum thread with valid data
  const threadPayload = {
    forum_id: validForumId,
    author_id: loginAuthorized.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEnterpriseLmsForumThread.ICreate;

  const createdThread: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.create(
      connection,
      {
        forumId: validForumId,
        body: threadPayload,
      },
    );
  typia.assert(createdThread);

  // Step 4: Validate returned forum thread data
  TestValidator.equals(
    "created thread forum_id",
    createdThread.forum_id,
    threadPayload.forum_id,
  );
  TestValidator.equals(
    "created thread author_id",
    createdThread.author_id,
    threadPayload.author_id,
  );
  TestValidator.equals(
    "created thread title",
    createdThread.title,
    threadPayload.title,
  );

  // Step 5: Error handling tests

  // 5a. Unauthorized user (simulate unauthenticated connection)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized forum thread creation fails",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.create(
        unauthConnection,
        {
          forumId: validForumId,
          body: threadPayload,
        },
      );
    },
  );

  // 5b. Invalid forumId results in 404 error
  await TestValidator.error(
    "invalid forumId forum thread creation fails",
    async () => {
      const invalidForumId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.create(
        connection,
        {
          forumId: invalidForumId,
          body: threadPayload,
        },
      );
    },
  );

  // 5c. Missing required fields causes validation error
  await TestValidator.error("missing required title field fails", async () => {
    const invalidPayload = {
      forum_id: validForumId,
      author_id: loginAuthorized.id,
      title: "",
    } satisfies IEnterpriseLmsForumThread.ICreate;
    await api.functional.enterpriseLms.corporateLearner.forums.forumThreads.create(
      connection,
      {
        forumId: validForumId,
        body: invalidPayload,
      },
    );
  });
}
