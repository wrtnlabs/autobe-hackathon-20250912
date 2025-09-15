import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import type { IEnterpriseLmsForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForumThread";
import type { IEnterpriseLmsForums } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsForums";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Validate the retrieval of a forum thread by an authenticated department
 * manager, with proper error handling for non-existent threads and unauthorized
 * access.
 *
 * This test performs the following steps:
 *
 * 1. Register and authenticate a department manager.
 * 2. Register and authenticate an organization admin.
 * 3. Create a forum using the organization admin role.
 * 4. Create a forum thread within the created forum.
 * 5. Retrieve the forum thread using the department manager role.
 * 6. Verify the returned forum thread data matches the created one.
 * 7. Attempt retrieval of a non-existent forum thread ID to confirm 404 error
 *    handling.
 * 8. Attempt retrieval without authentication to confirm unauthorized access is
 *    denied.
 */
export async function test_api_department_manager_forum_thread_retrieval_with_authentication_and_error_handling(
  connection: api.IConnection,
) {
  // 1. Register and authenticate the department manager
  const departmentManagerEmail = typia.random<string & tags.Format<"email">>();
  const departmentManagerPassword = "Password123!";
  const departmentManager: IEnterpriseLmsDepartmentManager.IAuthorized =
    await api.functional.auth.departmentManager.join(connection, {
      body: {
        email: departmentManagerEmail,
        password: departmentManagerPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IEnterpriseLmsDepartmentManager.ICreate,
    });
  typia.assert(departmentManager);

  // 2. Register and authenticate the organization admin
  const organizationAdminEmail = typia.random<string & tags.Format<"email">>();
  const organizationAdminPassword = "Password123!";
  // Use the departmentManager's tenant_id for the organization admin
  const organizationAdminCreateBody = {
    tenant_id: departmentManager.tenant_id,
    email: organizationAdminEmail,
    password: organizationAdminPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsOrganizationAdmin.ICreate;
  const organizationAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: organizationAdminCreateBody,
    });
  typia.assert(organizationAdmin);

  // 3. Create a forum with the organization admin role
  const forumCreateBody = {
    tenant_id: departmentManager.tenant_id,
    owner_id: organizationAdmin.id,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IEnterpriseLmsForums.ICreate;
  const forum: IEnterpriseLmsForums =
    await api.functional.enterpriseLms.organizationAdmin.forums.create(
      connection,
      {
        body: forumCreateBody,
      },
    );
  typia.assert(forum);

  // 4. Create a forum thread within the forum
  const forumThreadCreateBody = {
    forum_id: forum.id,
    author_id: organizationAdmin.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IEnterpriseLmsForumThread.ICreate;
  const forumThread: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.organizationAdmin.forums.forumThreads.create(
      connection,
      {
        forumId: forum.id,
        body: forumThreadCreateBody,
      },
    );
  typia.assert(forumThread);

  // 5. Authenticate as department manager (roles switching)
  await api.functional.auth.departmentManager.login(connection, {
    body: {
      email: departmentManagerEmail,
      password: departmentManagerPassword,
    } satisfies IEnterpriseLmsDepartmentManager.ILogin,
  });

  // 6. Retrieve the forum thread as department manager
  const retrievedForumThread: IEnterpriseLmsForumThread =
    await api.functional.enterpriseLms.departmentManager.forums.forumThreads.at(
      connection,
      {
        forumId: forum.id,
        forumThreadId: forumThread.id,
      },
    );
  typia.assert(retrievedForumThread);
  TestValidator.equals(
    "forumThread id matches",
    retrievedForumThread.id,
    forumThread.id,
  );
  TestValidator.equals(
    "forumThread forum_id matches",
    retrievedForumThread.forum_id,
    forumThread.forum_id,
  );
  TestValidator.equals(
    "forumThread author_id matches",
    retrievedForumThread.author_id,
    forumThread.author_id,
  );
  TestValidator.equals(
    "forumThread title matches",
    retrievedForumThread.title,
    forumThread.title,
  );
  TestValidator.equals(
    "forumThread body matches",
    retrievedForumThread.body ?? null,
    forumThread.body ?? null,
  );

  // 7. Test error scenario: non-existent forumThreadId
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieval of non-existent forumThreadId should fail",
    async () => {
      await api.functional.enterpriseLms.departmentManager.forums.forumThreads.at(
        connection,
        {
          forumId: forum.id,
          forumThreadId: nonExistentId,
        },
      );
    },
  );

  // 8. Test unauthorized access: retrieval without authentication
  // Prepare unauthenticated connection by clearing headers without manual manipulation
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  await TestValidator.error(
    "unauthenticated retrieval should fail",
    async () => {
      await api.functional.enterpriseLms.departmentManager.forums.forumThreads.at(
        unauthenticatedConnection,
        {
          forumId: forum.id,
          forumThreadId: forumThread.id,
        },
      );
    },
  );
}
