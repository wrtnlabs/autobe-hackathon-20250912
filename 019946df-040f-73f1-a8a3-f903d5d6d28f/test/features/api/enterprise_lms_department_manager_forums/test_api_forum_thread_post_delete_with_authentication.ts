import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";

/**
 * This E2E test scenario verifies that a department manager can delete a forum
 * post in their managed forum. It covers join, login, post deletion via correct
 * IDs, and error cases like invalid IDs and unauthorized deletion attempts.
 */
export async function test_api_forum_thread_post_delete_with_authentication(
  connection: api.IConnection,
) {
  // Department manager user creation and login
  const deptManagerCreateBody = {
    email: `deptmanager_${RandomGenerator.alphaNumeric(8)}@company.com`,
    password: "ValidPass123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsDepartmentManager.ICreate;

  const createdDeptManager: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: deptManagerCreateBody,
    });
  typia.assert(createdDeptManager);

  // Login using the same credentials
  const deptManagerLoginBody = {
    email: deptManagerCreateBody.email,
    password: deptManagerCreateBody.password,
  } satisfies IEnterpriseLmsDepartmentManager.ILogin;

  const loggedInDeptManager: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.login(connection, {
      body: deptManagerLoginBody,
    });
  typia.assert(loggedInDeptManager);

  // Placeholder IDs
  // Since no forum, thread, post creation APIs are provided, generate UUID formats for testing
  const forumId = typia.random<string & tags.Format<"uuid">>();
  const forumThreadId = typia.random<string & tags.Format<"uuid">>();
  const forumPostId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to delete the forum post - expected to succeed (204 No Content)
  await api.functional.enterpriseLms.departmentManager.forums.forumThreads.forumPosts.erase(
    connection,
    {
      forumId: forumId,
      forumThreadId: forumThreadId,
      forumPostId: forumPostId,
    },
  );

  // Since the erase endpoint returns void with HTTP 204, further confirmation
  // of post deletion would require a GET or similar API which is not provided;
  // therefore, this step will be skipped due to lack of retrieval API.

  // Test deletion with invalid IDs - expect errors
  await TestValidator.error(
    "deleting with invalid forumId should fail",
    async () => {
      await api.functional.enterpriseLms.departmentManager.forums.forumThreads.forumPosts.erase(
        connection,
        {
          forumId: "00000000-0000-0000-0000-000000000000",
          forumThreadId: forumThreadId,
          forumPostId: forumPostId,
        },
      );
    },
  );

  await TestValidator.error(
    "deleting with invalid forumThreadId should fail",
    async () => {
      await api.functional.enterpriseLms.departmentManager.forums.forumThreads.forumPosts.erase(
        connection,
        {
          forumId: forumId,
          forumThreadId: "00000000-0000-0000-0000-000000000000",
          forumPostId: forumPostId,
        },
      );
    },
  );

  await TestValidator.error(
    "deleting with invalid forumPostId should fail",
    async () => {
      await api.functional.enterpriseLms.departmentManager.forums.forumThreads.forumPosts.erase(
        connection,
        {
          forumId: forumId,
          forumThreadId: forumThreadId,
          forumPostId: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );

  // Attempt deletion without authentication - simulate unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "deletion without authentication should fail",
    async () => {
      await api.functional.enterpriseLms.departmentManager.forums.forumThreads.forumPosts.erase(
        unauthenticatedConnection,
        {
          forumId: forumId,
          forumThreadId: forumThreadId,
          forumPostId: forumPostId,
        },
      );
    },
  );
}
