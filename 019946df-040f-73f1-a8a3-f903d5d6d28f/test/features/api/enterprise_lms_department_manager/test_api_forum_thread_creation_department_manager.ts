import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import type { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";

/**
 * This E2E test validates the full flow of a Department Manager user creating a
 * forum thread in an existing forum. It covers registration, login, forum
 * thread creation, validation of created entity, and error handling.
 *
 * Steps:
 *
 * 1. Register a new Department Manager with valid tenant association.
 * 2. Login to obtain authentication tokens.
 * 3. Use or simulate an existing forumId.
 * 4. Create a forum thread with required title and optional body.
 * 5. Validate the returned forum thread entity for correct author and forum.
 * 6. Verify error scenarios for unauthorized user, invalid forumId, and missing
 *    title.
 *
 * Ensures only authenticated Department Managers can create threads, validates
 * business rules for forum and thread linkage, and checks error responses for
 * invalid inputs.
 */
export async function test_api_forum_thread_creation_department_manager(
  connection: api.IConnection,
) {
  // 1. Register a fresh Department Manager user
  const joinBody = {
    email: `manager_${RandomGenerator.alphaNumeric(8)}@company.com`,
    password: "P@ssw0rd",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsDepartmentManager.ICreate;

  const authorized: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Login to authenticate
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IEnterpriseLmsDepartmentManager.ILogin;

  const loginResult: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResult);

  // Non-null asserts to use ID
  const deptManagerId = typia.assert<string & tags.Format<"uuid">>(
    loginResult.id,
  );

  // 3. Assume existing forumId (simulate UUID for testing)
  const forumId = typia.random<string & tags.Format<"uuid">>();

  // 4. Create a valid forum thread
  const threadTitle = `Thread about ${RandomGenerator.name(2)}`;
  const threadBody = RandomGenerator.content({ paragraphs: 2 });

  const createBody = {
    forum_id: forumId,
    author_id: deptManagerId,
    title: threadTitle,
    body: threadBody,
  } satisfies IEnterpriseLmsForumThread.ICreate;

  const createdThread: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.departmentManager.forums.forumThreads.create(
      connection,
      {
        forumId,
        body: createBody,
      },
    );
  typia.assert(createdThread);

  TestValidator.equals(
    "created thread forum_id should match",
    createdThread.forum_id,
    forumId,
  );
  TestValidator.equals(
    "created thread author_id should match authenticated user id",
    createdThread.author_id,
    deptManagerId,
  );
  TestValidator.equals(
    "created thread title should match input title",
    createdThread.title,
    threadTitle,
  );

  // 5. Test error scenarios

  // 5a. Unauthorized access (empty headers simulating no auth)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user cannot create forum thread",
    async () => {
      await api.functional.enterpriseLms.departmentManager.forums.forumThreads.create(
        unauthConnection,
        {
          forumId,
          body: createBody,
        },
      );
    },
  );

  // 5b. Invalid forumId (likely non-existent UUID)
  const invalidForumId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("creation fails with invalid forumId", async () => {
    await api.functional.enterpriseLms.departmentManager.forums.forumThreads.create(
      connection,
      {
        forumId: invalidForumId,
        body: createBody,
      },
    );
  });

  // 5c. Missing required title field (empty string testing semantic invalidity)
  const createBodyMissingTitle = {
    forum_id: forumId,
    author_id: deptManagerId,
    title: "",
  } satisfies IEnterpriseLmsForumThread.ICreate;

  await TestValidator.error("creation fails with missing title", async () => {
    await api.functional.enterpriseLms.departmentManager.forums.forumThreads.create(
      connection,
      {
        forumId,
        body: createBodyMissingTitle,
      },
    );
  });
}
